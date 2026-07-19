from abc import ABC, abstractmethod


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
    ) -> str:
        """Return the model's reply text for a system + user message pair."""
