#!/bin/sh
set -e

echo "Waiting for Postgres..."
until pg_isready -h postgres -U finance -d finance_app >/dev/null 2>&1; do
  sleep 2
done
echo "Postgres is ready."

echo "Running database migrations..."
cd /app/packages/database
./node_modules/.bin/prisma migrate deploy

echo "Starting api-backend..."
cd /app/apps/api-backend
exec node dist/main.js
