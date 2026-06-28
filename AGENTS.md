# Finance App — Agent Context

pnpm + Turborepo monorepo for personal finance tracking from Gmail transaction emails.

## Apps

| App    | Path                 | Stack                                             |
| ------ | -------------------- | ------------------------------------------------- |
| Web    | `apps/web`           | Next.js 16, React 19, React Query, Tailwind v4    |
| API    | `apps/api-backend`   | NestJS 11, REST (3001) + gRPC (50051)             |
| Worker | `apps/python-worker` | Python 3.14, uv, RabbitMQ consumer, Anthropic LLM |

## Shared Packages

- `@repo/database` — Prisma 7 schema, migrations, client
- `@repo/proto` — gRPC `.proto` definitions
- `@repo/constant` — shared enums (SyncStatus, TransactionType)
- `@repo/ui` — shadcn-style Radix UI components
- `@repo/eslint-config`, `@repo/typescript-config` — shared tooling

## Email Processing Pipeline

```
Gmail API → api-backend (ingest) → body on disk (EMAIL_STORAGE_DIR)
         → RabbitMQ { gmailMessageId } → python-worker
         → LLM classify + extract → gRPC CompleteProcessing → Postgres
```

The Python worker **never** writes to Postgres directly. All persistence goes through gRPC to `apps/api-backend`.

## Dev Workflow

```bash
pnpm docker:up          # Postgres 16 + RabbitMQ
cp .env.example .env    # configure Google OAuth + secrets
pnpm db:migrate
pnpm dev                # all apps concurrently
```

External dependency: LM Studio (or compatible) at `ANTHROPIC_BASE_URL` for LLM inference.

## Global Invariants

- **Package manager:** pnpm only. Import shared code via `@repo/*` workspace packages — never relative paths across packages.
- **Environment:** Single root `.env` shared by all apps. New vars must be added to `.env.example` and `turbo.json` `globalEnv`.
- **Constants:** Use `@repo/constant` for enums (`DEBIT`/`CREDIT`, sync statuses) — do not duplicate in app code.
- **Email storage:** Bodies live on disk at `EMAIL_STORAGE_DIR` (default `ingested-emails/`). DB stores relative path only.
- **Auth:** Google OAuth through api-backend only. JWT in httpOnly `access_token` cookie.

## Agent Config Layout

Canonical, tool-agnostic config lives in `.agents/`:

- `.agents/rules/` — scoped conventions (synced to nested `AGENTS.md` and `.cursor/rules/`)
- `.agents/skills/` — reusable workflows ([Agent Skills](https://agentskills.io) format)
- `.agents/agents/` — subagent definitions (portable body; Cursor overlays in `*.cursor.yaml`)

Run `pnpm agent:sync` after editing `.agents/` to regenerate tool adapters.

| Tool                     | Adapter                                                     |
| ------------------------ | ----------------------------------------------------------- |
| Cursor                   | `.cursor/rules/*.mdc`, `.cursor/skills/`, `.cursor/agents/` |
| Claude Code              | `CLAUDE.md` (symlink), `.claude/skills/`                    |
| Codex / Copilot / others | Root + nested `AGENTS.md` files                             |

## Scoped Rules

File-specific conventions live in `.agents/rules/`:

- `web-frontend.md` — `apps/web/**`, `packages/ui/**`
- `api-backend.md` — `apps/api-backend/**`
- `python-worker.md` — `apps/python-worker/**`
- `database-prisma.md` — `packages/database/**`
- `grpc-contract.md` — proto + gRPC files across apps

Cursor auto-attaches these via `.cursor/rules/*.mdc` when matching files are open.
