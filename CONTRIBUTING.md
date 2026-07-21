# Contributing

Thanks for contributing to Finance App. This guide covers how to set up a development environment and how we expect changes to land.

## Getting started

1. Fork the repository and clone your fork.
2. Follow the full setup in [docs/development.md](docs/development.md):

   ```bash
   pnpm install
   pnpm docker:dev
   cp .env.example .env   # add Google OAuth + secrets
   pnpm db:migrate
   cd apps/python-worker && uv sync && cd ../..
   pnpm dev
   ```

3. Create a branch from `main` for your change.

## Development workflow

- **Package manager:** pnpm only. Do not add npm/yarn lockfiles.
- **Shared code:** import via `@repo/*` workspace packages — never relative imports across packages.
- **Environment:** one root `.env`. When adding a variable:
  1. Document it in `.env.example`
  2. Add it to `turbo.json` `globalEnv`
  3. If the worker needs it, add a typed field in `apps/python-worker/config.py`
- **Constants:** use `@repo/constant` for enums (`DEBIT` / `CREDIT`, sync statuses). Do not duplicate them in app code.
- **Database:** schema changes go through Prisma in `packages/database`. Prefer migrations over ad-hoc SQL.
- **gRPC / proto:** edit `packages/proto`, run `pnpm proto:generate`, then update Nest and Python clients. Never hand-edit `apps/python-worker/generated/`.
- **Python worker:** never write to Postgres from Python. Persist via gRPC `CompleteProcessing` on the API.
- **Email bodies:** store on disk under `EMAIL_STORAGE_DIR`; DB holds the relative path only.

## Before you open a PR

```bash
pnpm lint
pnpm format
pnpm check-types
```

Keep PRs focused (one concern per PR). Do not commit secrets (`.env`, credentials, tokens).

## Pull requests

1. Push your branch to your fork.
2. Open a PR against `main` on the upstream repo.
3. Describe **why** the change is needed and how to test it.
4. Link related issues when applicable.

## Project layout (quick map)

| Path | What lives there |
| ---- | ---------------- |
| `apps/web` | Next.js UI |
| `apps/api-backend` | NestJS REST + gRPC |
| `apps/python-worker` | RabbitMQ + LLM pipeline |
| `packages/database` | Prisma |
| `packages/proto` | gRPC contracts |
| `docs/` | Architecture, development, self-hosting guides |

Agent-oriented project invariants also live in [AGENTS.md](AGENTS.md).

## Questions

If something in setup or architecture is unclear, open an issue or ask in the PR. Prefer small clarifying questions over large speculative diffs.
