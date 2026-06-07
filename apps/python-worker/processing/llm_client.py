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
        last_error: Exception | None = None
        for attempt, strict in enumerate((False, True)):
            try:
                classification = LlmClassificationResponse.model_validate_json(
                    self.classify_is_transaction_email(header)
                )
                is_transaction_email = classification.is_transaction_email

                if not is_transaction_email:
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
                            "content": build_user_prompt(header, body, strict=strict),
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
                    raise ValueError("LLM incorrect response")

                if (
                    not parsed_raw_text.bank_name
                    or parsed_raw_text.transaction_value is None
                    or not parsed_raw_text.type
                    or not parsed_raw_text.transaction_date
                    or not parsed_raw_text.payment_made_to
                ):
                    raise ValueError("LLM returned incomplete transaction fields")

                return ExtractedTransaction(
                    bank_name=parsed_raw_text.bank_name,
                    transaction_value=parsed_raw_text.transaction_value,
                    type=parsed_raw_text.type,
                    transaction_date=parsed_raw_text.transaction_date,
                    payment_made_to=parsed_raw_text.payment_made_to,
                    is_transaction_email=True,
                )
            except Exception as error:
                last_error = error
                logger.warning(
                    "LLM extraction attempt %s failed: %s",
                    attempt + 1,
                    error,
                )

        assert last_error is not None
        raise last_error
