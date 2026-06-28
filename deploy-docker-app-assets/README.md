# Finance App — Docker distribution

Run the full stack with **pre-built images from GitHub Container Registry**. No source code, Node, Python, or pnpm required on this machine.

`.env` is included and ready to use.

Images pulled automatically:

| Service        | Image                                                      |
| -------------- | ---------------------------------------------------------- |
| Web            | `ghcr.io/aniketchanana/finance-app-web:latest`             |
| API            | `ghcr.io/aniketchanana/finance-app-api-backend:latest`     |
| Python worker  | `ghcr.io/aniketchanana/finance-app-python-worker:latest`   |

## Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (includes Docker Compose v2)
- [LM Studio](https://lmstudio.ai/) running on the host with the **OpenAI-compatible server** enabled (default port **1234**, path `/v1`) for email processing
- In LM Studio: **App Settings → Developer** → enable *separate reasoning_content and content in API responses* when using Gemma thinking models

## Run

```bash
mkdir -p ingested-emails
docker compose pull
docker compose up -d
```

Open http://localhost:3000 and sign in with Google.

## URLs

| Service      | URL                       |
| ------------ | ------------------------- |
| Web app      | http://localhost:3000     |
| API (proxy)  | http://localhost:3000/api |
| API (direct) | http://localhost:3001     |
| RabbitMQ UI  | http://localhost:15672    |

RabbitMQ login: `finance` / `finance`

## Stop

```bash
docker compose down
```

To remove data volumes as well:

```bash
docker compose down -v
```
