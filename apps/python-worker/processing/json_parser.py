import json
import re

from processing.models import ExtractedTransaction


def parse_transaction_json(raw_text: str) -> ExtractedTransaction:
    cleaned = raw_text.strip()
    cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"\s*```$", "", cleaned)

    start = cleaned.find("{")
    end = cleaned.rfind("}")
    if start == -1 or end == -1 or end <= start:
        raise ValueError("No JSON object found in LLM response")

    payload = json.loads(cleaned[start : end + 1])
    return ExtractedTransaction.model_validate(payload)
