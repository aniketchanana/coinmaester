#!/usr/bin/env bash
# Run docker compose for the combined Coinmaester + Langfuse project.
# Loads the root .env and, when present, docker/langfuse/.env.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

args=()
if [[ -f .env ]]; then
  args+=(--env-file .env)
fi
if [[ -f docker/langfuse/.env ]]; then
  args+=(--env-file docker/langfuse/.env)
fi

exec docker compose "${args[@]}" "$@"
