# Finance App

## Local development

1. `pnpm docker:up` — Postgres and RabbitMQ
2. Copy `.env.example` to `.env` and configure Google OAuth
3. `pnpm db:migrate` then `pnpm dev`

## Docker production

Run the full stack in containers:

```bash
pnpm docker:prod
```

| Service             | URL                       |
| ------------------- | ------------------------- |
| Web (browser)       | http://localhost:3000     |
| API (via app proxy) | http://localhost:3000/api |
| API (direct)        | http://localhost:3001     |
| RabbitMQ UI         | http://localhost:15672    |

Container networking overrides are in `docker/compose.env`. Email bodies are bind-mounted from `./ingested-emails/`. LM Studio must be running on the host at port 1234 for email processing.

## Distribution (pre-built images)

Production images are built and pushed to [GHCR](https://github.com/aniketchanana/finance-app/pkgs/container/finance-app-web) on every push to `main`.

Distribution compose lives in `deploy-docker-app-assets/docker-compose.yml` (tracked in git, GHCR pull-only). To share, copy your `.env` into that folder (apply Docker overrides from `docker/compose.env`), then zip:

```bash
cp .env deploy-docker-app-assets/.env
zip -r deploy-docker-app-assets.zip deploy-docker-app-assets
```

Recipients unzip and run:

```bash
mkdir -p ingested-emails
docker compose up -d
```

| Service             | URL                       |
| ------------------- | ------------------------- |
| Web (browser)       | http://localhost:3000     |
| API (via app proxy) | http://localhost:3000/api |
| API (direct)        | http://localhost:3001     |
| RabbitMQ UI         | http://localhost:15672    |

Images: `ghcr.io/aniketchanana/finance-app-{web,api-backend,python-worker}:latest`

## Email body storage

Gmail sync stores message headers in Postgres (`gmailMessages`) and bodies on disk:

- **Directory:** `./email/` at the repo root (created on first sync)
- **Filename:** `{GmailMessage.id}.txt` (Postgres primary key / cuid)
- **DB column:** `emailBody` holds the relative path, e.g. `email/clxyz123.txt`

Override the storage directory with `EMAIL_STORAGE_DIR` (absolute path, or relative to repo root).

The `ingested-emails/` directory is gitignored. Bodies persist across API and database container restarts because they live on the host filesystem.
