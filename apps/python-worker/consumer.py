import logging
import threading
from concurrent.futures import ThreadPoolExecutor

import grpc
import pika
from pika.adapters.blocking_connection import BlockingChannel
from pika.spec import Basic, BasicProperties

from config import settings
from grpc_client import GmailMessageGrpcClient
from models import GmailMessageQueuePayload
from processing import ClaimedMessage, MessageProcessor

logger = logging.getLogger(__name__)

CONCURRENCY = 4


class GmailMessageConsumer:
    def __init__(self) -> None:
        self._concurrency = CONCURRENCY
        self._grpc_client = GmailMessageGrpcClient()
        self._processor_local = threading.local()
        self._executor = ThreadPoolExecutor(
            max_workers=self._concurrency,
            thread_name_prefix="message-worker",
        )
        self._connection = pika.BlockingConnection(
            pika.URLParameters(settings.rabbitmq_url)
        )
        self._channel = self._connection.channel()
        self._channel.queue_declare(queue=settings.rabbitmq_queue, durable=True)
        self._channel.basic_qos(prefetch_count=self._concurrency)

    def start(self) -> None:
        logger.info(
            "Listening on queue %s (concurrency=%s)",
            settings.rabbitmq_queue,
            self._concurrency,
        )
        self._channel.basic_consume(
            queue=settings.rabbitmq_queue,
            on_message_callback=self._on_message,
            auto_ack=False,
        )
        self._channel.start_consuming()

    def stop(self) -> None:
        if self._channel.is_open:
            self._channel.stop_consuming()
        self._executor.shutdown(wait=True)
        if self._connection.is_open:
            self._connection.close()
        self._grpc_client.close()

    def _get_processor(self) -> MessageProcessor:
        processor = getattr(self._processor_local, "processor", None)
        if processor is None:
            processor = MessageProcessor()
            self._processor_local.processor = processor
        return processor

    def _on_message(
        self,
        channel: BlockingChannel,
        method: Basic.Deliver,
        _properties: BasicProperties,
        body: bytes,
    ) -> None:
        delivery_tag = method.delivery_tag

        try:
            payload = GmailMessageQueuePayload.model_validate_json(body)
            gmail_message_id = payload.gmail_message_id
        except ValueError as error:
            logger.error("Invalid queue message body: %s", body, exc_info=error)
            channel.basic_nack(delivery_tag=delivery_tag, requeue=False)
            return

        self._executor.submit(
            self._process_message,
            delivery_tag,
            gmail_message_id,
        )

    def _process_message(self, delivery_tag: int, gmail_message_id: str) -> None:
        claimed = False
        try:
            claim_response = self._grpc_client.claim_for_processing(
                gmail_message_id
            )
            claimed = True
            claim = ClaimedMessage(
                id=claim_response.id,
                header=claim_response.header,
                email_body=claim_response.email_body,
            )
            result = self._get_processor().process(claim)

            print('------result-----')
            print(result.transaction)
            print('------')
            self._grpc_client.complete_processing(
                gmail_message_id,
                transaction=result.transaction,
                failure_reason=result.failure_reason,
            )
            self._ack(delivery_tag)

            if result.failure_reason:
                logger.warning(
                    "Marked Gmail message %s as failed: %s",
                    gmail_message_id,
                    result.failure_reason,
                )
            else:
                logger.info(
                    "Processed Gmail message %s into transaction",
                    gmail_message_id,
                )
        except grpc.RpcError as error:
            if self._should_not_requeue_grpc_error(error):
                logger.warning(
                    "Non-retriable gRPC error for Gmail message %s: %s",
                    gmail_message_id,
                    error.details(),
                )
                self._ack(delivery_tag)
                return

            logger.exception(
                "Transient gRPC error processing Gmail message %s; requeueing",
                gmail_message_id,
            )
            self._nack(delivery_tag, requeue=True)
        except Exception:
            if claimed:
                try:
                    self._grpc_client.complete_processing(
                        gmail_message_id,
                        failure_reason="Unexpected worker error during processing",
                    )
                    self._ack(delivery_tag)
                    return
                except Exception:
                    logger.exception(
                        "Failed to mark Gmail message %s as failed after worker error",
                        gmail_message_id,
                    )

            logger.exception(
                "Failed to process Gmail message %s; requeueing",
                gmail_message_id,
            )
            self._nack(delivery_tag, requeue=True)

    @staticmethod
    def _should_not_requeue_grpc_error(error: grpc.RpcError) -> bool:
        if error.code() == grpc.StatusCode.NOT_FOUND:
            return True

        # Claim/precondition failures are not fixed by immediate requeue.
        if error.code() == grpc.StatusCode.FAILED_PRECONDITION:
            return True

        if error.code() == grpc.StatusCode.INVALID_ARGUMENT:
            return True

        return False

    def _ack(self, delivery_tag: int) -> None:
        self._connection.add_callback_threadsafe(
            lambda: self._channel.basic_ack(delivery_tag=delivery_tag)
        )

    def _nack(self, delivery_tag: int, *, requeue: bool) -> None:
        self._connection.add_callback_threadsafe(
            lambda: self._channel.basic_nack(
                delivery_tag=delivery_tag,
                requeue=requeue,
            )
        )
