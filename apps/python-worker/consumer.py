import logging

import pika
from pika.adapters.blocking_connection import BlockingChannel
from pika.spec import Basic, BasicProperties

from config import settings
from grpc_client import GmailMessageGrpcClient
from models import GmailMessageQueuePayload

logger = logging.getLogger(__name__)


class GmailMessageConsumer:
    def __init__(self) -> None:
        self._grpc_client = GmailMessageGrpcClient()
        self._connection = pika.BlockingConnection(
            pika.URLParameters(settings.rabbitmq_url)
        )
        self._channel = self._connection.channel()
        self._channel.queue_declare(queue=settings.rabbitmq_queue, durable=True)
        self._channel.basic_qos(prefetch_count=1)

    def start(self) -> None:
        logger.info("Listening on queue %s", settings.rabbitmq_queue)
        self._channel.basic_consume(
            queue=settings.rabbitmq_queue,
            on_message_callback=self._on_message,
            auto_ack=False,
        )
        self._channel.start_consuming()

    def stop(self) -> None:
        if self._channel.is_open:
            self._channel.stop_consuming()
        if self._connection.is_open:
            self._connection.close()
        self._grpc_client.close()

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

        try:
            claim = self._grpc_client.claim_for_processing(gmail_message_id)
            print(claim.header)

            self._grpc_client.complete_processing(gmail_message_id)
            channel.basic_ack(delivery_tag=delivery_tag)
            logger.info("Processed Gmail message %s", gmail_message_id)
        except Exception:
            logger.exception(
                "Failed to process Gmail message %s; requeueing",
                gmail_message_id,
            )
            channel.basic_nack(delivery_tag=delivery_tag, requeue=True)
