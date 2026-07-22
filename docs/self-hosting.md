# Self-hosting

Run the product for your own use: web and API in Docker, LLM worker on the host.

> **Note:** The Python worker is not containerized. The Hugging Face model needs reliable host CPU access. Compose starts Postgres, RabbitMQ, `api-backend`, and `web` only.

## Quick start

1. **Clone and configure**

   ```bash
   git clone https://github.com/aniketchanana/coinmaester.git
   cd coinmaester
   cp .env.example .env
   ```

   Fill in:

   - `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`
   - `AUTH_SECRET` / `TOKEN_ENCRYPTION_KEY` (`openssl rand -base64 32`)

2. **Start Docker stack**

   ```bash
   pnpm docker:prod
   ```

   This builds images, starts containers, and prints a reminder to start the worker.

3. **Start the Python worker on the host**

   ```bash
   pnpm install
   cd apps/python-worker && uv sync && cd ../..
   pnpm worker
   ```

   Root `.env` already points `RABBITMQ_URL` and `GRPC_HOST` at localhost. The API container publishes gRPC on `50051` and shares `./ingested-emails` with the host.

## Service URLs

| Service | URL |
| ------- | --- |
| Web | http://localhost:3000 |
| API (via app proxy) | http://localhost:3000/api |
| API (direct) | http://localhost:3001 |
| gRPC (host worker → API) | `localhost:50051` |
| RabbitMQ UI | http://localhost:15672 (`finance` / `finance`) |

## Google OAuth (Docker prod)

Register this redirect URI (web proxies `/api` to the API):

```
http://localhost:3000/api/auth/google/callback
```

If you also develop with `pnpm dev`, register both:

```
http://localhost:3001/auth/google/callback
http://localhost:3000/api/auth/google/callback
```

## How networking works

- Root [`.env`](../.env.example): localhost URLs for host processes (including `pnpm worker`).
- [`compose.env`](../compose.env): overrides for containers (Docker DNS names like `postgres`, `rabbitmq`, `api-backend`). Loaded after `.env` for `api-backend`.

Email bodies live in `./ingested-emails` on the host and are bind-mounted into the API container.

## Logs and teardown

```bash
docker compose --profile prod logs -f
docker compose --profile prod down
# or
pnpm docker:down
```

## Pre-built images

On pushes to `main`, CI publishes:

- `ghcr.io/aniketchanana/coinmaester-web:latest`
- `ghcr.io/aniketchanana/coinmaester-api-backend:latest`

There is **no** published python-worker image. Full email processing always requires a host worker with model weights available locally.

For day-to-day self-hosting, prefer `pnpm docker:prod` (builds from this repo) plus `pnpm worker`.
