---
name: setup
description: Bootstrap the local dev environment from scratch (Docker, env, DB, all apps).
disable-model-invocation: true
---

# Dev Environment Setup

Run these steps in order. Stop and report if any step fails.

1. **Install dependencies**

   ```bash
   pnpm install
   ```

2. **Start infrastructure** (Postgres 16 + RabbitMQ)

   ```bash
   pnpm docker:up
   ```

   Verify both containers are healthy with `docker compose ps`.

3. **Configure environment**
   - If root `.env` does not exist: `cp .env.example .env`
   - Required manual values: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
   - Generate secrets if placeholders are present:
     `openssl rand -base64 32` for `AUTH_SECRET` and `TOKEN_ENCRYPTION_KEY`
   - LLM inference loads a Hugging Face model in-process (default `HF_MODEL_ID=microsoft/Phi-4-mini-instruct`)

4. **Run migrations**

   ```bash
   pnpm db:migrate
   ```

5. **Python worker deps** (uses uv, not pip)

   ```bash
   cd apps/python-worker && uv sync
   ```

6. **Start all apps**

   ```bash
   pnpm dev
   ```

   Expected: web on :3000, API on :3001, gRPC on :50051, worker consuming RabbitMQ.
