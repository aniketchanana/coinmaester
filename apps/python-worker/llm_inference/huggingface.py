from __future__ import annotations

import logging
import threading
from typing import Any

from llm_inference.base import LlmProvider
from llm_inference.errors import LlmError

logger = logging.getLogger(__name__)

_load_lock = threading.Lock()
_generate_lock = threading.Lock()
_shared_pipeline: Any | None = None
_shared_model_id: str | None = None
_shared_device: str | None = None


def _resolve_device(preferred: str) -> str:
    import torch

    if preferred != "auto":
        return preferred
    if torch.cuda.is_available():
        return "cuda"
    if getattr(torch.backends, "mps", None) is not None and torch.backends.mps.is_available():
        return "mps"
    return "cpu"


def _ensure_pipeline(model_id: str, device: str) -> tuple[Any, str]:
    global _shared_pipeline, _shared_model_id, _shared_device

    with _load_lock:
        resolved = _resolve_device(device)
        if (
            _shared_pipeline is not None
            and _shared_model_id == model_id
            and _shared_device == resolved
        ):
            return _shared_pipeline, resolved

        try:
            from transformers import pipeline
        except ImportError as error:
            raise LlmError(
                "transformers is required for the Hugging Face provider"
            ) from error

        logger.info(
            "Loading Hugging Face model %s on device=%s",
            model_id,
            resolved,
        )
        try:
            generator = pipeline(
                task="text-generation",
                model=model_id,
                tokenizer=model_id,
                device=resolved,
                dtype="auto",
            )
        except Exception as error:
            raise LlmError(f"Failed to load Hugging Face model {model_id}: {error}") from error

        _shared_pipeline = generator
        _shared_model_id = model_id
        _shared_device = resolved
        logger.info("Hugging Face model %s ready on %s", model_id, resolved)
        return generator, resolved


class HuggingFaceProvider(LlmProvider):
    """In-process Hugging Face transformers provider with process-wide model cache."""

    def __init__(
        self,
        *,
        model_id: str = "microsoft/Phi-4-mini-instruct",
        device: str = "auto",
        max_new_tokens: int = 1024,
    ) -> None:
        self._model_id = model_id
        self._device = device
        self._max_new_tokens = max_new_tokens

    def generate(
        self,
        system: str,
        user: str,
        *,
        max_tokens: int = 1024,
        temperature: float = 0.0,
    ) -> str:
        generator, _device = _ensure_pipeline(self._model_id, self._device)

        messages = [
            {"role": "system", "content": system},
            {"role": "user", "content": user},
            # Prefill forces raw JSON objects instead of markdown fences.
            {"role": "assistant", "content": "{"},
        ]

        try:
            try:
                # Continue the prefilled assistant response after "{".
                prompt = generator.tokenizer.apply_chat_template(
                    messages,
                    tokenize=False,
                    continue_final_message=True,
                )
            except TypeError:
                # Older tokenizers: avoid starting a second assistant response.
                prompt = generator.tokenizer.apply_chat_template(
                    messages,
                    tokenize=False,
                    add_generation_prompt=False,
                )

            generate_kwargs: dict[str, Any] = {
                "max_new_tokens": max_tokens or self._max_new_tokens,
                "return_full_text": False,
            }
            if temperature and temperature > 0:
                generate_kwargs["do_sample"] = True
                generate_kwargs["temperature"] = temperature
            else:
                generate_kwargs["do_sample"] = False

            with _generate_lock:
                outputs = generator(prompt, **generate_kwargs)

            continuation = outputs[0]["generated_text"]
            if not isinstance(continuation, str):
                raise LlmError("Hugging Face pipeline returned an invalid response")
            return ("{" + continuation).strip()
        except LlmError:
            raise
        except Exception as error:
            raise LlmError(f"Hugging Face generation failed: {error}") from error
