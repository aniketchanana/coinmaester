FROM ghcr.io/astral-sh/uv:python3.14-bookworm-slim

WORKDIR /app

COPY apps/python-worker/pyproject.toml apps/python-worker/uv.lock ./apps/python-worker/

WORKDIR /app/apps/python-worker
RUN uv sync --frozen --no-dev

WORKDIR /app
COPY apps/python-worker ./apps/python-worker

RUN mkdir -p /app/ingested-emails

WORKDIR /app/apps/python-worker

CMD ["uv", "run", "python", "main.py"]
