from dataclasses import dataclass

import anthropic

from processing.email_reader import EmailBodyReader
from processing.llm_client import TransactionLlmClient
from processing.models import ExtractedTransaction


@dataclass
class ClaimedMessage:
    id: str
    header: str
    email_body: str


@dataclass
class ProcessingResult:
    transaction: ExtractedTransaction | None = None
    failure_reason: str | None = None


class MessageProcessor:
    def __init__(self) -> None:
        self._email_reader = EmailBodyReader()
        self._llm_client = TransactionLlmClient()

    def process(self, claim: ClaimedMessage) -> ProcessingResult:
        if not claim.email_body:
            return ProcessingResult(
                failure_reason="Email body path is missing on claimed message"
            )

        try:
            body = self._email_reader.read(claim.email_body)
        except (FileNotFoundError, ValueError) as error:
            return ProcessingResult(failure_reason=str(error))

        if not body.strip():
            return ProcessingResult(failure_reason="Email body is empty")

        try:
            transaction = self._llm_client.extract_transaction(claim.header, body)
            return ProcessingResult(transaction=transaction)
        except anthropic.APIError as error:
            return ProcessingResult(
                failure_reason=f"Anthropic API error during extraction: {error}"
            )
        except Exception as error:
            return ProcessingResult(
                failure_reason=f"Unexpected error during extraction: {error}"
            )
