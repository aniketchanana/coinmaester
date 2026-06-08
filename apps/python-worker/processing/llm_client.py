import logging

import anthropic
from pydantic import ValidationError

from config import settings
from processing.models import (
    ExtractedTransaction,
    LlmClassificationResponse,
    LlmTransactionResponse,
    empty_transaction,
)
from processing.prompts import SYSTEM_PROMPT, build_user_prompt, CLASSIFY_SYSTEM_PROMPT

logger = logging.getLogger(__name__)


def _to_extracted_transaction(parsed: LlmTransactionResponse) -> ExtractedTransaction:
    if not parsed.is_transaction_email:
        return empty_transaction()

    missing_fields = [
        field
        for field, value in (
            ("transaction_value", parsed.transaction_value),
            ("type", parsed.type),
            ("transaction_date", parsed.transaction_date),
        )
        if value is None
        or (isinstance(value, str) and not value.strip())
    ]
    if missing_fields:
        logger.warning(
            "LLM returned incomplete transaction fields: %s",
            ", ".join(missing_fields),
        )
        return empty_transaction()

    return ExtractedTransaction(
        bank_name=parsed.bank_name or "",
        transaction_value=abs(parsed.transaction_value),
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

    def classify_is_transaction_email(self, header: str) -> str:
        response = self._client.messages.create(
            model=settings.anthropic_model,
            max_tokens=1024,
            system=CLASSIFY_SYSTEM_PROMPT,
            temperature=0,
            messages=[
                {
                    "role": "user",
                    "content": header,
                }
            ],
        )
        return response.content[0].text.strip()

    def extract_transaction(self, header: str, body: str) -> ExtractedTransaction:
        try:
            classification = LlmClassificationResponse.model_validate_json(
                self.classify_is_transaction_email(header)
            )
        except (ValidationError, ValueError) as error:
            logger.warning("Failed to parse classification response: %s", error)
            return empty_transaction()

        if not classification.is_transaction_email:
            return empty_transaction()

        response = self._client.messages.create(
            model=settings.anthropic_model,
            max_tokens=1024,
            system=SYSTEM_PROMPT,
            temperature=0,
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
            logger.warning("LLM returned an empty extraction response")
            return empty_transaction()

        try:
            parsed_raw_text = LlmTransactionResponse.model_validate_json(raw_text)
            print('---------')
            print(parsed_raw_text)
            print('---------')
        except (ValidationError, ValueError) as error:
            logger.warning("Failed to parse extraction response: %s", error)
            return empty_transaction()

        if not parsed_raw_text.is_transaction_email:
            return empty_transaction()

        return _to_extracted_transaction(parsed_raw_text)
