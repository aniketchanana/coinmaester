"""Strip Gemma-style thinking prefixes from LM responses."""

_CHANNEL_DELIMITER = "<channel|>"


def strip_channel_delimiter(raw: str) -> tuple[str, bool]:
    """Return (payload, was_stripped).

    Gemma 4 wraps internal reasoning in <|channel>thought ... <channel|> before the
    final answer. Only splits when <channel|> is present; otherwise returns unchanged.
    """
    text = (raw or "").strip()
    if _CHANNEL_DELIMITER not in text:
        return text, False
    return text.rsplit(_CHANNEL_DELIMITER, 1)[-1].strip(), True
