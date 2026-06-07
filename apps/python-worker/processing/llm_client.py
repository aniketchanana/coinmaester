import logging

import anthropic

from config import settings
from processing.json_parser import parse_transaction_json
from processing.models import ExtractedTransaction
from processing.prompts import SYSTEM_PROMPT, build_user_prompt

logger = logging.getLogger(__name__)


class TransactionLlmClient:
    def __init__(self) -> None:
        self._client = anthropic.Anthropic(
            api_key=settings.anthropic_api_key,
            base_url=settings.anthropic_base_url,
        )

    def extract_transaction(self, header: str, body: str) -> ExtractedTransaction:
        last_error: Exception | None = None

        for attempt, strict in enumerate((False, True)):
            try:
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

                return parse_transaction_json(raw_text)
            except Exception as error:
                last_error = error
                logger.warning(
                    "LLM extraction attempt %s failed: %s",
                    attempt + 1,
                    error,
                )

        assert last_error is not None
        raise last_error
