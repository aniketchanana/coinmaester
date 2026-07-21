# Finance App

Personal finance tracking from Gmail transaction emails. Sync inbox messages, classify them with a local Hugging Face model, extract amounts and merchants, and explore spending in a web UI.

This is a **pnpm + Turborepo** monorepo: Next.js web app, NestJS API, and a Python worker that runs the LLM **on the host** (not in Docker).

## Architecture

```
Gmail API → api-backend (ingest) → body on disk (EMAIL_STORAGE_DIR)
         → RabbitMQ { gmailMessageId } → python-worker (host)
         → LLM classify + extract → gRPC CompleteProcessing → Postgres
```

The Python worker never writes to Postgres directly. All persistence goes through gRPC to the API.

More detail: [docs/architecture.md](docs/architecture.md)

## Tech stack

| Layer | Path | Stack |
| ----- | ---- | ----- |
| **Web** | `apps/web` | Next.js 16, React 19, React Query, Tailwind v4 |
| **API** | `apps/api-backend` | NestJS 11 — REST (`:3001`) + gRPC (`:50051`) |
| **Worker** | `apps/python-worker` | Python 3.14, uv, RabbitMQ consumer, Hugging Face LLM (in-process) |
| **Database** | `packages/database` | Prisma 7, PostgreSQL 16 |
| **Contracts** | `packages/proto` | gRPC `.proto` definitions shared by API and worker |
| **UI kit** | `packages/ui` | shadcn-style Radix components |
| **Infra** | Docker Compose | Postgres + RabbitMQ (always); web + API optional via `docker:prod` |

## Prerequisites

Install these before running the app:

| Requirement | Version / notes | Why |
| ----------- | --------------- | --- |
| **Node.js** | 18+ | Runs the monorepo (web + API via pnpm/Turborepo) |
| **pnpm** | 9 ([install](https://pnpm.io/installation)) | Only supported package manager |
| **Docker** | With Compose ([install](https://docs.docker.com/get-docker/)) | Postgres 16 + RabbitMQ (`docker:dev`); also web + API for `docker:prod` |
| **Python** | 3.14+ | Runtime for `apps/python-worker` |
| **uv** | Latest ([install](https://docs.astral.sh/uv/)) | Installs and runs the Python worker deps |
| **Google Cloud OAuth client** | [Console](https://console.cloud.google.com/) | Sign-in + Gmail API access |

**Also useful to know:**

- First worker start downloads Hugging Face model weights (default `microsoft/Phi-4-mini-instruct`) — needs disk space and a capable CPU (or GPU if you set `HF_DEVICE`).
- The LLM worker always runs on the **host**, not inside Docker.
- Generate auth secrets with `openssl rand -base64 32` for `AUTH_SECRET` and `TOKEN_ENCRYPTION_KEY` in `.env`.

## Use it yourself (self-host)

Run web + API in Docker; run the LLM worker on the host.

```bash
cp .env.example .env   # set Google OAuth + secrets
pnpm docker:prod       # Postgres, RabbitMQ, api-backend, web
pnpm install
cd apps/python-worker && uv sync && cd ../..
pnpm worker            # required for email classification
```

Full steps, OAuth URIs, and ports: [docs/self-hosting.md](docs/self-hosting.md)

## Develop / contribute

```bash
pnpm install
pnpm docker:dev        # Postgres + RabbitMQ only
cp .env.example .env   # configure OAuth + secrets
pnpm db:migrate
cd apps/python-worker && uv sync && cd ../..
pnpm dev               # web, API, worker via Turborepo
```

- Local development guide: [docs/development.md](docs/development.md)
- Contribution guidelines: [CONTRIBUTING.md](CONTRIBUTING.md)

## Scripts cheat sheet

| Command | What it does |
| ------- | ------------ |
| `pnpm docker:dev` | Start Postgres + RabbitMQ |
| `pnpm docker:prod` | Build/start web + API + infra in Docker (prints how to start the worker) |
| `pnpm docker:down` | Stop Compose services |
| `pnpm dev` | Start all apps (web, API, worker) locally |
| `pnpm worker` | Start only the Python LLM worker |
| `pnpm db:migrate` | Run Prisma migrations |
| `pnpm proto:generate` | Regenerate gRPC Python stubs |

## Service URLs (local)

| Service | URL |
| ------- | --- |
| Web | http://localhost:3000 |
| API (direct) | http://localhost:3001 |
| API (via web proxy, Docker prod) | http://localhost:3000/api |
| gRPC | `localhost:50051` |
| RabbitMQ management | http://localhost:15672 (`finance` / `finance`) |

## Environment

Single root `.env` is shared by all apps. Copy from [`.env.example`](.env.example).

For `docker:prod`, container networking overrides live in [`compose.env`](compose.env) (Docker DNS hostnames for Postgres, RabbitMQ, and gRPC). The host-run worker keeps using localhost values from `.env`.

Email bodies are stored under `EMAIL_STORAGE_DIR` (default `./ingested-emails/`). That directory is bind-mounted into the API container so the host worker and containerized API share the same files.
