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
            channel.basic_ack(delivery_tag=delivery_tag)
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
            self._complete_and_log(gmail_message_id, result)
            self._ack(delivery_tag)
        except grpc.RpcError as error:
            logger.warning(
                "gRPC error processing Gmail message %s: %s",
                gmail_message_id,
                error.details(),
            )
            if claimed:
                self._mark_failed(
                    gmail_message_id,
                    f"gRPC error during processing: {error.details()}",
                )
            self._ack(delivery_tag)
        except Exception:
            logger.exception(
                "Unexpected error processing Gmail message %s",
                gmail_message_id,
            )
            if claimed:
                self._mark_failed(
                    gmail_message_id,
                    "Unexpected worker error during processing",
                )
            self._ack(delivery_tag)

    def _complete_and_log(
        self,
        gmail_message_id: str,
        result,
    ) -> None:
        try:
            self._grpc_client.complete_processing(
                gmail_message_id,
                transaction=self._to_grpc_transaction(result.transaction),
                failure_reason=result.failure_reason,
            )
        except grpc.RpcError as error:
            if self._should_complete_as_skipped(error):
                logger.warning(
                    "Completion rejected for Gmail message %s (%s); "
                    "completing with empty transaction",
                    gmail_message_id,
                    error.details(),
                )
                self._complete_as_skipped(gmail_message_id)
                return

            logger.warning(
                "gRPC error completing Gmail message %s: %s",
                gmail_message_id,
                error.details(),
            )
            self._mark_failed(
                gmail_message_id,
                f"gRPC error during completion: {error.details()}",
            )
            return

        if result.failure_reason:
            logger.warning(
                "Marked Gmail message %s as failed: %s",
                gmail_message_id,
                result.failure_reason,
            )
            return

        transaction = result.transaction
        if (
            transaction is not None
            and transaction.is_transaction_email
            and transaction.transaction_value > 0
        ):
            logger.info("=====> Transaction: %s", transaction)
            logger.info(
                "Completed Gmail message %s with transaction",
                gmail_message_id,
            )
        else:
            logger.info(
                "Completed Gmail message %s (no transaction to persist)",
                gmail_message_id,
            )

    @staticmethod
    def _should_complete_as_skipped(error: grpc.RpcError) -> bool:
        if error.code() == grpc.StatusCode.INVALID_ARGUMENT:
            return True

        details = (error.details() or "").lower()
        return "invalid transaction" in details

    def _complete_as_skipped(self, gmail_message_id: str) -> None:
        try:
            self._grpc_client.complete_processing(gmail_message_id)
            logger.info(
                "Completed Gmail message %s (no transaction to persist)",
                gmail_message_id,
            )
        except Exception:
            logger.exception(
                "Failed to complete Gmail message %s as skipped",
                gmail_message_id,
            )

    @staticmethod
    def _to_grpc_transaction(transaction):
        if transaction is None:
            return None

        if (
            not transaction.is_transaction_email
            or transaction.transaction_value <= 0
            or not transaction.type
            or not str(transaction.transaction_date).strip()
        ):
            return None

        return transaction

    def _mark_failed(self, gmail_message_id: str, failure_reason: str) -> None:
        try:
            self._grpc_client.complete_processing(
                gmail_message_id,
                failure_reason=failure_reason,
            )
            logger.warning(
                "Marked Gmail message %s as failed: %s",
                gmail_message_id,
                failure_reason,
            )
        except Exception:
            logger.exception(
                "Failed to mark Gmail message %s as failed",
                gmail_message_id,
            )

    def _ack(self, delivery_tag: int) -> None:
        self._connection.add_callback_threadsafe(
            lambda: self._channel.basic_ack(delivery_tag=delivery_tag)
        )
