"""Strip Gemma-style thinking prefixes from LM responses."""

_CHANNEL_DELIMITER = "<channel|>"


def strip_channel_delimiter(raw: str) -> tuple[str, bool]:
    """Return (payload, was_stripped).

    Only splits when <channel|> is present; otherwise returns the text unchanged.
    """
    text = (raw or "").strip()
    if _CHANNEL_DELIMITER not in text:
        return text, False
    return text.rsplit(_CHANNEL_DELIMITER, 1)[-1].strip(), True
