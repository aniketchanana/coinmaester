import sys
from pathlib import Path

import grpc

_GENERATED_DIR = Path(__file__).resolve().parent / "generated"
sys.path.insert(0, str(_GENERATED_DIR))

import gmail_message_pb2
import gmail_message_pb2_grpc

from config import settings
from processing.models import ExtractedTransaction


class GmailMessageGrpcClient:
    def __init__(self) -> None:
        self._channel = grpc.insecure_channel(settings.grpc_host)
        self._stub = gmail_message_pb2_grpc.GmailMessageProcessingStub(
            self._channel
        )

    def claim_for_processing(
        self, gmail_message_id: str
    ) -> gmail_message_pb2.ClaimResponse:
        request = gmail_message_pb2.ClaimRequest(
            gmail_message_id=gmail_message_id
        )
        return self._stub.ClaimForProcessing(request)

    def complete_processing(
        self,
        gmail_message_id: str,
        *,
        transaction: ExtractedTransaction | None = None,
        failure_reason: str | None = None,
    ) -> gmail_message_pb2.CompleteResponse:
        request = gmail_message_pb2.CompleteRequest(
            gmail_message_id=gmail_message_id,
            failure_reason=failure_reason or "",
        )

        if transaction is not None:
            request.transaction.CopyFrom(
                gmail_message_pb2.ExtractedTransaction(
                    bank_name=transaction.bank_name,
                    transaction_value=transaction.transaction_value,
                    type=transaction.type,
                    transaction_date=transaction.transaction_date,
                    payment_made_to=transaction.payment_made_to,
                    is_transaction_email=transaction.is_transaction_email,
                )
            )

        return self._stub.CompleteProcessing(request)

    def close(self) -> None:
        self._channel.close()
