import logging
from typing import Any, TypeVar

from openai import OpenAI
from pydantic import BaseModel, ValidationError

from config import settings
from processing.llm_response import openai_json_schema_format
from processing.models import (
    ExtractedTransaction,
    LlmClassificationResponse,
    LlmTransactionResponse,
    empty_transaction,
)
from processing.prompts import JSON_DATA_SYSTEM_PROMPT, build_user_prompt, CLASSIFY_SYSTEM_PROMPT
from processing.text_preprocess import clean_email_body

logger = logging.getLogger(__name__)

ModelT = TypeVar("ModelT", bound=BaseModel)

# LM Studio request defaults (not env-configurable).
_USE_JSON_SCHEMA = True
_REASONING_EFFORT = "high"


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
        self._client = OpenAI(
            api_key=settings.openai_api_key,
            base_url=settings.openai_base_url,
        )

    def _build_request_kwargs(
        self,
        *,
        step: str,
        schema_model: type[ModelT] | None,
    ) -> dict[str, Any]:
        request_kwargs: dict[str, Any] = {
            "extra_body": {"reasoning_effort": _REASONING_EFFORT},
        }

        if _USE_JSON_SCHEMA and schema_model is not None:
            request_kwargs["response_format"] = openai_json_schema_format(
                schema_model,
                step,
            )

        logger.info(
            "LLM %s request: model=%s json_schema=%s reasoning_effort=%s",
            step,
            settings.openai_model,
            schema_model.__name__ if _USE_JSON_SCHEMA and schema_model else None,
            _REASONING_EFFORT,
        )
        return request_kwargs

    def _chat(
        self,
        *,
        step: str,
        system: str,
        user_content: str,
        schema_model: type[ModelT] | None = None,
    ) -> str:
        response = self._client.chat.completions.create(
            model=settings.openai_model,
            max_tokens=1024,
            temperature=0,
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": user_content},
            ],
            **self._build_request_kwargs(step=step, schema_model=schema_model),
        )
        message = response.choices[0].message
        reasoning = getattr(message, "reasoning_content", None)
        content = (message.content or "").strip()

        if reasoning:
            logger.info(
                "LLM %s: reasoning_content (%d chars): %.300s",
                step,
                len(reasoning),
                reasoning,
            )
        else:
            logger.warning(
                "LLM %s: no reasoning_content field — enable LM Studio "
                "App Settings → Developer → separate reasoning_content and content",
                step,
            )

        logger.info("LLM %s content (%d chars): %s", step, len(content), content)

        if reasoning is None and content and not content.startswith("{"):
            logger.warning(
                "LLM %s: content does not look like JSON; thinking may still be "
                "mixed in — fix LM Studio reasoning separation for this model",
                step,
            )

        return content

    def classify_is_transaction_email(self, header: str) -> str:
        logger.info('----SENDING HEADER-----')
        logger.info(header)
        logger.info('----SENDING HEADER-----')
        return self._chat(
            step="classification",
            system=CLASSIFY_SYSTEM_PROMPT,
            user_content=header,
            schema_model=LlmClassificationResponse,
        )

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

        raw_text = self._chat(
            step="extraction",
            system=JSON_DATA_SYSTEM_PROMPT,
            user_content=build_user_prompt(header, cleaned_body),
            schema_model=LlmTransactionResponse,
        )

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
