---
name: proto-change
description: Update the gRPC contract between api-backend and python-worker. Use when modifying ClaimForProcessing, CompleteProcessing, or ExtractedTransaction fields.
---

# gRPC Proto Change Workflow

## Steps

1. **Edit proto** — modify `packages/proto/gmail_message.proto`
   - Keep field numbers stable; add new fields with next available number
   - Do not rename or renumber existing fields (breaks compatibility)

2. **Regenerate stubs**
   ```bash
   pnpm proto:generate
   ```
   This updates `apps/python-worker/generated/` (Python gRPC stubs).

3. **Update NestJS gRPC layer**
   - `apps/api-backend/src/grpc/gmail-message.grpc-controller.ts` — request/response handling
   - `apps/api-backend/src/grpc/gmail-message-processing.service.ts` — business logic

4. **Update Python worker**
   - `apps/python-worker/grpc_client.py` — gRPC call methods
   - `apps/python-worker/processing/models.py` — pydantic models with camelCase aliases
   - `apps/python-worker/processing/processor.py` — if extraction logic changes

5. **Verify field mapping**
   Proto snake_case → Python camelCase aliases:
   ```python
   bank_name: str = Field(alias="bankName")
   ```

## Checklist

- [ ] Proto compiles (`pnpm proto:generate` succeeds)
- [ ] NestJS controller handles new/changed fields
- [ ] Python pydantic models match with correct aliases
- [ ] Both apps restarted to pick up changes
- [ ] End-to-end: ingest email → worker processes → transaction saved
