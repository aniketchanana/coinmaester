# Contributing

Thanks for contributing to Coinmaester. This guide covers how to set up a development environment and how we expect changes to land.

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

## Pre-commit hooks

After `pnpm install`, [Husky](https://typicode.github.io/husky/) installs a git **pre-commit** hook. Every commit runs:

```bash
pnpm lint   # ESLint across packages that define a lint script
pnpm test   # Jest (and any other package test scripts) via Turborepo
```

If either step fails, the commit is **blocked**. Fix the reported issues and commit again.

To run the same checks manually (without committing):

```bash
pnpm precommit
```

> [!NOTE]
> Hooks install via the root `prepare` script on `pnpm install`. If git hooks are missing (e.g. after cloning without install), run `pnpm install` or `pnpm prepare`.

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

Pre-commit already enforces lint and tests. Before opening a PR, also run:

```bash
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
