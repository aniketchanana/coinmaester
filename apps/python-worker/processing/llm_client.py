import logging

import anthropic

from config import settings
from processing.models import (
    ExtractedTransaction,
    LlmClassificationResponse,
    LlmTransactionResponse,
)
from processing.prompts import SYSTEM_PROMPT, build_user_prompt, CLASSIFY_SYSTEM_PROMPT

logger = logging.getLogger(__name__)


def _to_extracted_transaction(parsed: LlmTransactionResponse) -> ExtractedTransaction:
    if not parsed.is_transaction_email:
        return ExtractedTransaction(
            bank_name="",
            transaction_value=0,
            type="DEBIT",
            transaction_date="",
            payment_made_to="",
            is_transaction_email=False,
        )

    missing_fields = [
        field
        for field, value in (
            ("transaction_value", parsed.transaction_value),
            ("type", parsed.type),
        )
        if value is None
    ]
    if missing_fields:
        raise ValueError(
            "LLM returned incomplete transaction fields: "
            + ", ".join(missing_fields)
        )

    return ExtractedTransaction(
        bank_name=parsed.bank_name or "",
        transaction_value=parsed.transaction_value,
        type=parsed.type,
        transaction_date=parsed.transaction_date or "",
        payment_made_to=parsed.payment_made_to or "",
        is_transaction_email=True,
    )


class TransactionLlmClient:
    def __init__(self) -> None:
        self._client = anthropic.Anthropic(
            api_key=settings.anthropic_api_key,
            base_url=settings.anthropic_base_url,
        )

    def classify_is_transaction_email(self, header: str) -> bool:
        response = self._client.messages.create(
            model=settings.anthropic_model,
            max_tokens=1024,
            system=CLASSIFY_SYSTEM_PROMPT,
            messages=[
                {
                    "role": "user",
                    "content": header,
                }
            ],
        )
        return response.content[0].text.strip()

    def extract_transaction(self, header: str, body: str) -> ExtractedTransaction:
        classification = LlmClassificationResponse.model_validate_json(
            self.classify_is_transaction_email(header)
        )

        if not classification.is_transaction_email:
            return ExtractedTransaction(
                bank_name="",
                transaction_value=0,
                type="DEBIT",
                transaction_date="",
                payment_made_to="",
                is_transaction_email=False,
            )

        response = self._client.messages.create(
            model=settings.anthropic_model,
            max_tokens=1024,
            system=SYSTEM_PROMPT,
            messages=[
                {
                    "role": "user",
                    "content": build_user_prompt(header, body),
                }
            ],
        )

        text_blocks = [
            block.text
            for block in response.content
            if block.type == "text"
        ]
        raw_text = "\n".join(text_blocks).strip()

        if not raw_text:
            raise ValueError("LLM returned an empty response")

        parsed_raw_text = LlmTransactionResponse.model_validate_json(raw_text)

        if not parsed_raw_text.is_transaction_email:
            raise ValueError(
                "Classification marked email as transaction but extraction did not"
            )

        return _to_extracted_transaction(parsed_raw_text)
