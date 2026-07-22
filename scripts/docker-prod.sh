#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

echo "[1/4] Checking environment..."
mkdir -p ingested-emails

if [[ ! -f .env ]]; then
  cp .env.example .env
  echo "  Created .env from .env.example"
fi

if grep -q 'generate-with-openssl-rand-base64-32' .env 2>/dev/null; then
  echo "  Warning: AUTH_SECRET or TOKEN_ENCRYPTION_KEY still use placeholder values."
  echo "  Generate secrets with: openssl rand -base64 32"
fi

if grep -q 'GOOGLE_CLIENT_ID=""' .env 2>/dev/null || \
   grep -q 'GOOGLE_CLIENT_ID=$' .env 2>/dev/null; then
  echo "  Warning: GOOGLE_CLIENT_ID is not set — Google OAuth will not work."
fi

echo "[2/4] Building production images (this may take a few minutes)..."
echo "[3/4] Starting containers (Postgres, RabbitMQ, api-backend, web)..."
docker compose --profile prod up --build -d --force-recreate

echo "[4/4] Waiting for services to become reachable..."
for i in $(seq 1 30); do
  if curl -sf http://127.0.0.1:3000/ >/dev/null 2>&1 && \
     curl -sf http://127.0.0.1:3000/api/health >/dev/null 2>&1 && \
     curl -sf http://127.0.0.1:3001/health >/dev/null 2>&1; then
    echo ""
    echo "Stack is up."
    echo ""
    echo "  Web:          http://localhost:3000"
    echo "  API (app):    http://localhost:3000/api"
    echo "  API (direct): http://localhost:3001"
    echo "  gRPC:         localhost:50051"
    echo "  RabbitMQ UI:  http://localhost:15672  (finance / finance)"
    echo ""
    echo "  Google OAuth redirect URI must include:"
    echo "    http://localhost:3000/api/auth/google/callback"
    echo ""
    echo "============================================================"
    echo "  Python worker is NOT run in Docker."
    echo "  The Hugging Face LLM needs host CPU access."
    echo ""
    echo "  Start it separately in another terminal:"
    echo "    pnpm worker"
    echo ""
    echo "  (Requires: uv sync in apps/python-worker, root .env"
    echo "   with RABBITMQ_URL/GRPC_HOST pointing at localhost,"
    echo "   and shared ./ingested-emails with the API container.)"
    echo "============================================================"
    echo ""
    echo "  Logs: docker compose --profile prod logs -f"
    exit 0
  fi
  sleep 2
done

echo ""
echo "Containers started but http://localhost:3000 is not responding yet."
echo "Check logs: docker compose --profile prod logs -f"
echo ""
echo "Remember: start the python worker on the host with: pnpm worker"
exit 1
