# syntax=docker/dockerfile:1.7
ARG BUN_VERSION=1.3.10

FROM oven/bun:${BUN_VERSION}-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production

# No dependencies to install — the script uses Bun's built-in SQL + fetch.
COPY main.ts ./

USER bun

CMD ["bun", "run", "main.ts"]
