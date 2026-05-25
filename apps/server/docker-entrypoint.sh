#!/bin/sh
set -e

echo "[entrypoint] running database migrations"
bun run scripts/migrate-prod.ts

echo "[entrypoint] starting server"
exec bun run --preload ./src/lib/instrument.ts src/index.ts
