from __future__ import annotations

import logging
import threading
from collections.abc import Iterator
from contextlib import contextmanager
from typing import Any

from config import settings

logger = logging.getLogger(__name__)

_lock = threading.Lock()
_client: Any | None = None
_initialized = False


class _NoOpObservation:
    def update(self, **_kwargs: Any) -> None:
        return None


def get_langfuse() -> Any | None:
    """Return the process-wide Langfuse client, or None when tracing is off."""
    global _client, _initialized

    if _initialized:
        return _client

    with _lock:
        if _initialized:
            return _client

        if not settings.langfuse_public_key or not settings.langfuse_secret_key:
            logger.info("Langfuse tracing disabled (LANGFUSE_PUBLIC_KEY is empty)")
            _initialized = True
            return None

        try:
            from langfuse import Langfuse

            _client = Langfuse(
                public_key=settings.langfuse_public_key,
                secret_key=settings.langfuse_secret_key,
                base_url=settings.langfuse_base_url,
            )
        except Exception:
            logger.exception("Failed to initialize Langfuse; tracing disabled")
            _client = None
            _initialized = True
            return None

        _initialized = True
        try:
            if _client.auth_check():
                logger.info("Langfuse tracing enabled (%s)", settings.langfuse_base_url)
            else:
                logger.warning(
                    "Langfuse auth check failed; traces may not be ingested"
                )
        except Exception:
            logger.warning("Langfuse auth check failed", exc_info=True)
        return _client


@contextmanager
def start_observation(**kwargs: Any) -> Iterator[Any]:
    """Open a Langfuse observation, or a no-op when tracing is disabled."""
    client = get_langfuse()
    if client is None:
        yield _NoOpObservation()
        return

    with client.start_as_current_observation(**kwargs) as observation:
        yield observation


def flush_langfuse() -> None:
    client = get_langfuse()
    if client is None:
        return
    try:
        client.flush()
    except Exception:
        logger.exception("Failed to flush Langfuse traces")
