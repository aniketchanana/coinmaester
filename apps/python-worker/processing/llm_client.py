import logging

from pydantic import ValidationError

from config import settings
from llm_inference import LlmProvider, LlmProviderConfig, create_provider
from processing.models import (
    ExtractedTransaction,
    LlmClassificationResponse,
    LlmTransactionResponse,
    empty_transaction,
)
from processing.prompts import JSON_DATA_SYSTEM_PROMPT, build_user_prompt, CLASSIFY_SYSTEM_PROMPT
from processing.text_preprocess import clean_email_body

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
    def __init__(self, provider: LlmProvider | None = None) -> None:
        self._provider = provider or create_provider(
            LlmProviderConfig(
                hf_model_id=settings.hf_model_id,
                hf_device=settings.hf_device,
                hf_max_new_tokens=settings.hf_max_new_tokens,
            )
        )

    def classify_is_transaction_email(self, header: str) -> str:
        text = self._provider.generate(
            CLASSIFY_SYSTEM_PROMPT,
            header,
            max_tokens=settings.hf_max_new_tokens,
            temperature=0,
        ).strip()
        logger.debug("LLM classification payload: %s", text)
        return text

    def extract_transaction(self, header: str, body: str) -> ExtractedTransaction:
        try:
            classification = LlmClassificationResponse.model_validate_json(
                self.classify_is_transaction_email(header)
            )
            logger.debug("Classification result: %s", classification)
        except (ValidationError, ValueError) as error:
            logger.warning("Failed to parse classification response: %s", error)
            return empty_transaction()

        if not classification.is_transaction_email:
            return empty_transaction()

        cleaned_body = clean_email_body(body)
        logger.info(
            "Email body trimmed for LLM: %d -> %d chars",
            len(body),
            len(cleaned_body),
        )

        raw_text = self._provider.generate(
            JSON_DATA_SYSTEM_PROMPT,
            build_user_prompt(header, cleaned_body),
            max_tokens=settings.hf_max_new_tokens,
            temperature=0,
        ).strip()
        logger.debug("LLM extraction payload: %s", raw_text)

        if not raw_text:
            logger.warning("LLM returned an empty extraction response")
            return empty_transaction()

        try:
            parsed_raw_text = LlmTransactionResponse.model_validate_json(raw_text)
            logger.debug("Extraction result: %s", parsed_raw_text)
        except (ValidationError, ValueError) as error:
            logger.warning("Failed to parse extraction response: %s", error)
            return empty_transaction()

        if not parsed_raw_text.is_transaction_email:
            return empty_transaction()

        return _to_extracted_transaction(parsed_raw_text)
