from __future__ import annotations

from dataclasses import dataclass

from llm_inference.base import LlmProvider
from llm_inference.huggingface import HuggingFaceProvider


@dataclass(frozen=True)
class LlmProviderConfig:
    hf_model_id: str = "microsoft/Phi-4-mini-instruct"
    hf_device: str = "auto"
    hf_max_new_tokens: int = 1024


def create_provider(config: LlmProviderConfig) -> LlmProvider:
    return HuggingFaceProvider(
        model_id=config.hf_model_id,
        device=config.hf_device,
        max_new_tokens=config.hf_max_new_tokens,
    )
