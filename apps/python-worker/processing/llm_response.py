"""OpenAI-compatible request helpers for LM Studio structured output."""

from typing import TypeVar

from pydantic import BaseModel

ModelT = TypeVar("ModelT", bound=BaseModel)


def openai_json_schema_format(model: type[ModelT], name: str) -> dict:
    """LM Studio structured output (json_schema — not json_object)."""
    return {
        "type": "json_schema",
        "json_schema": {
            "name": name,
            "strict": True,
            "schema": model.model_json_schema(by_alias=True),
        },
    }
