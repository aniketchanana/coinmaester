"""Convert raw email bodies into plain English text before they reach the LLM.

The api-backend stores the Gmail ``text/plain`` part when present, but falls back
to the raw ``text/html`` part otherwise (see ``gmail-ingestion.service.ts``).
Marketing-heavy bank emails are therefore frequently full HTML documents bloated
with inline CSS, tracking links, and base64 image blobs. Feeding that verbatim to
the model wastes the context window and can overflow it for larger emails.

This module strips the markup/noise and returns readable text — the full message
is preserved (never truncated mid-email), while staying dependency-free (stdlib
only).
"""

import re
from html import unescape
from html.parser import HTMLParser

# Container tags whose textual content is never useful to the model. These all have
# a matching close tag, so depth tracking is safe. Void elements (meta, link, etc.)
# are deliberately excluded — they never close, which would leave the skip counter
# stuck and silently swallow the entire body.
_SKIP_TAGS = frozenset({"script", "style", "head", "title", "noscript"})

# Tags that imply a line/paragraph break in the rendered output.
_BLOCK_TAGS = frozenset(
    {
        "p", "br", "div", "tr", "table", "ul", "ol", "li", "h1", "h2", "h3",
        "h4", "h5", "h6", "header", "footer", "section", "article", "blockquote",
        "td", "th", "hr",
    }
)

_DATA_URI_RE = re.compile(r"\b(?:data):[^\s\"')]+", re.IGNORECASE)
_URL_RE = re.compile(r"https?://[^\s\"'<>)]+", re.IGNORECASE)
_MULTISPACE_RE = re.compile(r"[ \t\f\v]+")
_MULTINEWLINE_RE = re.compile(r"\n{3,}")
# A line with no letters or digits (CSS leftovers, separators, decoration).
_NOISE_LINE_RE = re.compile(r"^[^0-9A-Za-z]*$")


class _HtmlTextExtractor(HTMLParser):
    """Collects visible text from HTML, skipping noise tags and dropping markup."""

    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self._chunks: list[str] = []
        self._skip_depth = 0

    def handle_starttag(self, tag: str, attrs: object) -> None:
        if tag in _SKIP_TAGS:
            self._skip_depth += 1
        elif tag in _BLOCK_TAGS:
            self._chunks.append("\n")

    def handle_endtag(self, tag: str) -> None:
        if tag in _SKIP_TAGS and self._skip_depth > 0:
            self._skip_depth -= 1
        elif tag in _BLOCK_TAGS:
            self._chunks.append("\n")

    def handle_data(self, data: str) -> None:
        if self._skip_depth == 0:
            self._chunks.append(data)

    def get_text(self) -> str:
        return "".join(self._chunks)


def _looks_like_html(body: str) -> bool:
    sample = body[:4096].lower()
    return "<html" in sample or "<body" in sample or "<div" in sample or "<table" in sample


def _strip_html(body: str) -> str:
    parser = _HtmlTextExtractor()
    try:
        parser.feed(body)
        parser.close()
    except Exception:
        # Malformed markup: fall back to a crude tag strip so we still send text.
        return unescape(re.sub(r"<[^>]+>", " ", body))
    return parser.get_text()


def _shorten_urls(text: str) -> str:
    """Drop base64 data URIs entirely and trim tracking query strings from links."""
    text = _DATA_URI_RE.sub("[data]", text)

    def _trim(match: re.Match[str]) -> str:
        url = match.group(0)
        # Keep scheme://host/path, discard the (often huge) tracking query/fragment.
        return re.split(r"[?#]", url, maxsplit=1)[0]

    return _URL_RE.sub(_trim, text)


def _collapse_whitespace(text: str) -> str:
    lines: list[str] = []
    for raw_line in text.splitlines():
        line = _MULTISPACE_RE.sub(" ", raw_line).strip()
        if not line or _NOISE_LINE_RE.match(line):
            lines.append("")
            continue
        lines.append(line)

    collapsed = "\n".join(lines)
    return _MULTINEWLINE_RE.sub("\n\n", collapsed).strip()


def _has_meaningful_text(text: str) -> bool:
    """True if there is real content worth sending (letters/digits, not just markup)."""
    return any(char.isalnum() for char in text)


def clean_email_body(body: str) -> str:
    """Convert a raw email body into readable plain text for the LLM prompt.

    Steps: HTML → text, drop base64/tracking-URL noise, and collapse whitespace.
    The full message is preserved — it is never truncated mid-email.

    Safety: cleaning must never destroy a body that actually had content. If the
    cleaned result loses all meaningful text, we progressively fall back to a crude
    tag strip and finally to the raw body so the LLM always gets *something*.
    """
    if not body:
        return ""

    text = _strip_html(body) if _looks_like_html(body) else body
    text = _shorten_urls(text)
    text = _collapse_whitespace(text)

    # Don't trust an empty/markup-only result when the source clearly had text.
    if not _has_meaningful_text(text) and _has_meaningful_text(body):
        crude = _collapse_whitespace(_shorten_urls(unescape(re.sub(r"<[^>]+>", " ", body))))
        text = crude if _has_meaningful_text(crude) else body.strip()

    return text
