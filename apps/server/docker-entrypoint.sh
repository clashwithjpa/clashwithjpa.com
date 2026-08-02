#!/bin/sh
set -e

echo "[entrypoint] running database migrations"
node dist/migrate-prod.js

echo "[entrypoint] starting server"
exec node --import ./dist/lib/instrument.js dist/index.js
