# gRPC Contract

## Source of Truth

`packages/proto/gmail_message.proto` defines the `GmailMessageProcessing` service:

- `ClaimForProcessing(ClaimRequest) → ClaimResponse`
- `CompleteProcessing(CompleteRequest) → CompleteResponse`

## Change Workflow

Any proto change requires updates across **all services**:

1. Edit `packages/proto/gmail_message.proto`
2. Run `pnpm proto:generate` (regenerates Python stubs in `apps/python-worker/generated/`)
3. Update NestJS handler in `apps/api-backend/src/grpc/`
4. Update Python client in `apps/python-worker/grpc_client.py` and processor if needed
5. Verify pydantic aliases match proto field names (snake_case in proto → camelCase aliases in Python)

## Field Naming

Proto uses snake_case (`bank_name`, `transaction_value`). Python pydantic models use camelCase aliases:

```python
bank_name: str = Field(alias="bankName")
```

NestJS gRPC layer handles the mapping automatically.

## Never Edit Generated Files

`apps/python-worker/generated/` is codegen output. Always regenerate, never hand-edit.
