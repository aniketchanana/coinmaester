# Finance App

## Local development

1. `pnpm docker:up` — Postgres and RabbitMQ
2. Copy `.env.example` to `.env` and configure Google OAuth
3. `pnpm db:migrate` then `pnpm dev`

## Email body storage

Gmail sync stores message headers in Postgres (`gmailMessages`) and bodies on disk:

- **Directory:** `./email/` at the repo root (created on first sync)
- **Filename:** `{GmailMessage.id}.txt` (Postgres primary key / cuid)
- **DB column:** `emailBody` holds the relative path, e.g. `email/clxyz123.txt`

Override the storage directory with `EMAIL_STORAGE_DIR` (absolute path, or relative to repo root).

The `ingested-emails/` directory is gitignored. Bodies persist across API and database container restarts because they live on the host filesystem.

## Roadmap

- Build gmail ingestion flow [x]
- Local filesystem storage for email bodies [x]
- Add a durable persistence queue which will put put email to queue for python worker to pick one by one
- Add a python worker which will pick up the gmail message and run the AI based processing on it
- dockerize and publish the application so that it is simpler for anyone to run locally
- Replace the cron job which you are using to poll emailSync table instead use pg-boss as a queue
