<div align="center">

# Coinmaester

**Personal finance tracking from Gmail transaction emails.**

Sync inbox messages, classify them with a local Hugging Face model, extract amounts and merchants, and explore spending in a web UI.

<br />

![Next.js](https://img.shields.io/badge/Next.js_16-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)
![React](https://img.shields.io/badge/React_19-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![NestJS](https://img.shields.io/badge/NestJS_11-E0234E?style=for-the-badge&logo=nestjs&logoColor=white)
![Python](https://img.shields.io/badge/Python_3.14-3776AB?style=for-the-badge&logo=python&logoColor=white)

![Prisma](https://img.shields.io/badge/Prisma_7-2D3748?style=for-the-badge&logo=prisma&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL_16-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)
![RabbitMQ](https://img.shields.io/badge/RabbitMQ-FF6600?style=for-the-badge&logo=rabbitmq&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)

![pnpm](https://img.shields.io/badge/pnpm-F69220?style=for-the-badge&logo=pnpm&logoColor=white)
![Turborepo](https://img.shields.io/badge/Turborepo-EF4444?style=for-the-badge&logo=turborepo&logoColor=white)
![Hugging Face](https://img.shields.io/badge/Hugging_Face-FFD21E?style=for-the-badge&logo=huggingface&logoColor=black)
![Tailwind](https://img.shields.io/badge/Tailwind_v4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)

</div>

This is a **pnpm + Turborepo** monorepo: Next.js web app, NestJS API, and a Python worker that runs the LLM **on the host** (not in Docker).

## Documentation

Pick a guide based on what you're trying to do:

| Guide | Open this when you want to… |
| ----- | --------------------------- |
| [![Architecture](https://img.shields.io/badge/Architecture-6366F1?style=for-the-badge&logo=diagramsdotnet&logoColor=white)](docs/architecture.md) | Understand the email → LLM → Postgres pipeline, host worker vs Docker, apps and packages |
| [![Self-hosting](https://img.shields.io/badge/Self--hosting-10B981?style=for-the-badge&logo=docker&logoColor=white)](docs/self-hosting.md) | Run the product for yourself: Docker web/API + host LLM worker, OAuth URIs, networking |
| [![Local development](https://img.shields.io/badge/Local_development-3B82F6?style=for-the-badge&logo=visualstudiocode&logoColor=white)](docs/development.md) | Set up a fork for day-to-day coding (`pnpm docker:dev` + `pnpm dev`), ports, conventions |
| [![Contributing](https://img.shields.io/badge/Contributing-F59E0B?style=for-the-badge&logo=git&logoColor=white)](CONTRIBUTING.md) | Learn PR workflow, coding conventions, and what to run before opening a PR |

## Architecture

```mermaid
flowchart LR
    gmail([Gmail API]) --> api[api-backend<br/>ingest]
    api --> disk[(body on disk<br/>EMAIL_STORAGE_DIR)]
    api --> mq{{RabbitMQ<br/>gmailMessageId}}
    mq --> worker[python-worker<br/>host]
    worker --> llm[LLM classify<br/>+ extract]
    llm -- gRPC CompleteProcessing --> api
    api --> pg[(Postgres)]

    style gmail fill:#EA4335,color:#fff,stroke:#EA4335
    style api fill:#E0234E,color:#fff,stroke:#E0234E
    style disk fill:#6B7280,color:#fff,stroke:#6B7280
    style mq fill:#FF6600,color:#fff,stroke:#FF6600
    style worker fill:#3776AB,color:#fff,stroke:#3776AB
    style llm fill:#FFD21E,color:#000,stroke:#FFD21E
    style pg fill:#4169E1,color:#fff,stroke:#4169E1
```

> [!IMPORTANT]
> The Python worker never writes to Postgres directly. All persistence goes through gRPC to the API. See [Architecture](docs/architecture.md) for the full pipeline and storage/auth details.

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

> [!NOTE]
> First worker start downloads Hugging Face model weights (default `microsoft/Phi-4-mini-instruct`) — needs disk space and a capable CPU (or GPU if you set `HF_DEVICE`). The LLM worker always runs on the **host**, not inside Docker.

> [!TIP]
> Generate auth secrets with `openssl rand -base64 32` for `AUTH_SECRET` and `TOKEN_ENCRYPTION_KEY` in `.env`.

## Use it yourself (self-host)

Run web + API in Docker; run the LLM worker on the host.

```bash
cp .env.example .env   # set Google OAuth + secrets
pnpm docker:prod       # Postgres, RabbitMQ, api-backend, web
pnpm install
cd apps/python-worker && uv sync && cd ../..
pnpm worker            # required for email classification
```

Full steps, OAuth URIs, and ports: [Self-hosting](docs/self-hosting.md)

## Develop / contribute

```bash
pnpm install
pnpm docker:dev        # Postgres + RabbitMQ only
cp .env.example .env   # configure OAuth + secrets
pnpm db:migrate
cd apps/python-worker && uv sync && cd ../..
pnpm dev               # web, API, worker via Turborepo
```

- Day-to-day setup and ports: [Local development](docs/development.md)
- PR workflow and conventions: [Contributing](CONTRIBUTING.md)

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
