import sys
from pathlib import Path

import grpc

_GENERATED_DIR = Path(__file__).resolve().parent / "generated"
sys.path.insert(0, str(_GENERATED_DIR))

import gmail_message_pb2
import gmail_message_pb2_grpc

from config import settings


class GmailMessageGrpcClient:
    def __init__(self) -> None:
        self._channel = grpc.insecure_channel(settings.grpc_host)
        self._stub = gmail_message_pb2_grpc.GmailMessageProcessingStub(
            self._channel
        )

    def claim_for_processing(self, gmail_message_id: str) -> gmail_message_pb2.ClaimResponse:
        request = gmail_message_pb2.ClaimRequest(
            gmail_message_id=gmail_message_id
        )
        return self._stub.ClaimForProcessing(request)

    def complete_processing(
        self, gmail_message_id: str
    ) -> gmail_message_pb2.CompleteResponse:
        request = gmail_message_pb2.CompleteRequest(
            gmail_message_id=gmail_message_id
        )
        return self._stub.CompleteProcessing(request)

    def close(self) -> None:
        self._channel.close()
