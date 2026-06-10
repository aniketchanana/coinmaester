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
