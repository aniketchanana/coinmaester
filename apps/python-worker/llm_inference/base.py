from abc import ABC, abstractmethod
from dataclasses import dataclass


@dataclass(frozen=True)
class LlmCompletion:
    """Model reply plus tokenizer counts for the prompt and continuation."""

    text: str
    model: str
    input_tokens: int
    output_tokens: int


class LlmProvider(ABC):
    """Minimal chat-completion interface shared by all LLM backends."""

    @abstractmethod
    def generate(
        self,
        system: str,
        user: str,
        *,
        max_tokens: int = 1024,
        temperature: float = 0.0,
    ) -> LlmCompletion:
        """Return the model's reply and token counts for a system + user pair."""
