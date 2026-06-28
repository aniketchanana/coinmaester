# Python Worker

## Package Management

Use **uv** (not pip). Dev: `uv run watchfiles 'python main.py' .`

## Configuration

- pydantic-settings in `config.py` reads root `.env`.
- Never hardcode paths — use `EMAIL_STORAGE_DIR` for email body resolution.

## LLM Processing Pipeline

Two-step flow in `processing/llm_client.py`:

1. **Classify** header → `LlmClassificationResponse`
2. **Extract** body (if transaction) → `LlmTransactionResponse`

All LLM JSON must validate against strict pydantic models in `processing/models.py`:

```python
model_config = ConfigDict(populate_by_name=True, extra="forbid")
```

Transaction-detection rules and prompts belong in `processing/prompts.py` — not inline in client code.

## gRPC Client

- Stubs in `generated/` — **never edit by hand**.
- Regenerate via `pnpm proto:generate` after proto changes.
- Pydantic models use camelCase aliases for gRPC field compatibility.

## Concurrency

Consumer runs 4 threads (`consumer.py`). Keep `MessageProcessor` instances thread-local and stateless between calls.

## Persistence

The worker **never** touches Postgres. All writes go through gRPC `CompleteProcessing` to api-backend.
