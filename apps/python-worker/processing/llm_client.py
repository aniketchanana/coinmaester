import logging

import anthropic
from pydantic import ValidationError

from config import settings
from processing.llm_response import strip_channel_delimiter
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


def _text_from_response(response: anthropic.types.Message, *, step: str) -> str:
    raw = "\n".join(
        block.text for block in response.content if block.type == "text"
    ).strip()
    payload, was_stripped = strip_channel_delimiter(raw)
    if was_stripped:
        logger.info(
            "LLM %s: stripped thinking prefix after <%s> (%d -> %d chars)",
            step,
            "channel|",
            len(raw),
            len(payload),
        )
    else:
        logger.info(
            "LLM %s: no <%s> delimiter — using response as-is (%d chars)",
            step,
            "channel|",
            len(payload),
        )
    logger.info("LLM %s payload: %s", step, payload)
    return payload


class TransactionLlmClient:
    def __init__(self) -> None:
        self._client = anthropic.Anthropic(
            api_key=settings.anthropic_api_key,
            base_url=settings.anthropic_base_url,
        )

    def classify_is_transaction_email(self, header: str) -> str:
        logger.info('----SENDING HEADER-----')
        logger.info(header)
        logger.info('----SENDING HEADER-----')
        response = self._client.messages.create(
            model=settings.anthropic_model,
            max_tokens=1024,
            system=CLASSIFY_SYSTEM_PROMPT,
            temperature=0,
            messages=[{"role": "user", "content": header}],
        )
        return _text_from_response(response, step="classification")

    def extract_transaction(self, header: str, body: str) -> ExtractedTransaction:
        logger.info('-----HEADER-----')
        logger.info(header)
        logger.info('-----HEADER-----')
        try:
            classification = LlmClassificationResponse.model_validate_json(
                self.classify_is_transaction_email(header)
            )
            logger.info("Classification result: %s", classification)
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

        response = self._client.messages.create(
            model=settings.anthropic_model,
            max_tokens=1024,
            system=JSON_DATA_SYSTEM_PROMPT,
            temperature=0,
            messages=[
                {
                    "role": "user",
                    "content": build_user_prompt(header, cleaned_body),
                }
            ],
        )

        raw_text = _text_from_response(response, step="extraction")

        if not raw_text:
            logger.warning("LLM returned an empty extraction response")
            return empty_transaction()

        try:
            parsed_raw_text = LlmTransactionResponse.model_validate_json(raw_text)
            logger.info("Extraction result: %s", parsed_raw_text)
        except (ValidationError, ValueError) as error:
            logger.warning("Failed to parse extraction response: %s", error)
            return empty_transaction()

        if not parsed_raw_text.is_transaction_email:
            return empty_transaction()

        return _to_extracted_transaction(parsed_raw_text)
