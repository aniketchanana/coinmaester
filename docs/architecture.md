# Architecture

Coinmaester turns bank/transaction emails into structured spending data.

## Pipeline

```
Email inbox
  → api-backend (OAuth sync / ingest)
  → message headers in Postgres (`gmailMessages`)
  → email body on disk (`EMAIL_STORAGE_DIR`, default `ingested-emails/`)
  → RabbitMQ message `{ gmailMessageId }`
  → python-worker (host process)
  → Hugging Face LLM: classify → extract (if transaction)
  → gRPC `CompleteProcessing` → api-backend → Postgres (transactions)
```

### Why the worker runs on the host

The worker loads a Hugging Face model in-process (default `microsoft/Phi-4-mini-instruct`). Running that inside Docker is unreliable for typical laptop CPU setups, so Compose **does not** include `python-worker`. Use `pnpm worker` (or `pnpm dev`, which starts it via Turborepo) on the host.

In hybrid `docker:prod` mode:

- Web + API + Postgres + RabbitMQ run in containers
- Worker on the host talks to RabbitMQ at `localhost:5672` and gRPC at `localhost:50051`
- API publishes gRPC on host port `50051` for this reason
- `./ingested-emails` is shared via a bind mount

## Apps

| App | Path | Role |
| --- | ---- | ---- |
| Web | `apps/web` | Dashboard, auth UI, analytics. Next.js 16, React 19, React Query, Tailwind v4 |
| API | `apps/api-backend` | Google OAuth, email sync, REST for the UI, gRPC for the worker. NestJS 11 |
| Worker | `apps/python-worker` | RabbitMQ consumer, LLM classify/extract. Python 3.14 + uv |

## Shared packages

| Package | Purpose |
| ------- | ------- |
| `@repo/database` | Prisma 7 schema, migrations, client |
| `@repo/proto` | gRPC `.proto` definitions |
| `@repo/constant` | Shared enums (`DEBIT` / `CREDIT`, sync statuses) |
| `@repo/ui` | shadcn-style Radix UI components |
| `@repo/eslint-config`, `@repo/typescript-config` | Shared tooling |

## Email body storage

- **Directory:** `EMAIL_STORAGE_DIR` (default `ingested-emails/` at repo root)
- **Filename:** `{GmailMessage.id}.txt` (cuid primary key)
- **DB column:** stores the relative path only (e.g. `ingested-emails/clxyz123.txt`)

The directory is gitignored. Bodies persist across container restarts because they live on the host filesystem.

## Auth

Google OAuth is handled only by `api-backend`. Session is a JWT in an httpOnly `access_token` cookie.
