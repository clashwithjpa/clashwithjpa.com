# syntax=docker/dockerfile:1.7

ARG BUN_VERSION=1.3.10

# ---- base ----------------------------------------------------------------
FROM oven/bun:${BUN_VERSION}-alpine AS base
WORKDIR /app

# ---- deps: install full workspace dependencies (incl. dev) ---------------
# Kept as a dedicated stage so the lockfile is validated against the full
# workspace graph and the layer is cached across builds.
FROM base AS deps

COPY package.json bun.lock turbo.json ./
COPY apps/server/package.json ./apps/server/
COPY apps/web/package.json ./apps/web/
COPY packages/clashking-client/package.json ./packages/clashking-client/
COPY packages/clashofclans-api/package.json ./packages/clashofclans-api/
COPY packages/clashofclans-client/package.json ./packages/clashofclans-client/
COPY packages/eslint-config/package.json ./packages/eslint-config/
COPY packages/prettier-config/package.json ./packages/prettier-config/
COPY packages/typescript-config/package.json ./packages/typescript-config/

RUN --mount=type=cache,target=/root/.bun/install/cache \
    bun install --frozen-lockfile --ignore-scripts

# ---- prod-deps: install only production dependencies ---------------------
FROM base AS prod-deps

COPY package.json bun.lock turbo.json ./
COPY apps/server/package.json ./apps/server/
COPY apps/web/package.json ./apps/web/
COPY packages/clashking-client/package.json ./packages/clashking-client/
COPY packages/clashofclans-api/package.json ./packages/clashofclans-api/
COPY packages/clashofclans-client/package.json ./packages/clashofclans-client/
COPY packages/eslint-config/package.json ./packages/eslint-config/
COPY packages/prettier-config/package.json ./packages/prettier-config/
COPY packages/typescript-config/package.json ./packages/typescript-config/

RUN --mount=type=cache,target=/root/.bun/install/cache \
    bun install --frozen-lockfile --production --ignore-scripts

# ---- runtime -------------------------------------------------------------
FROM oven/bun:${BUN_VERSION}-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production \
    PORT=3000

# Production node_modules at every level bun created them (root hoist,
# server workspace, and per-package — bun doesn't fully hoist transitive
# deps of workspace packages, so /app/packages/*/node_modules matters).
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=prod-deps /app/apps/server/node_modules ./apps/server/node_modules
COPY --from=prod-deps /app/packages ./packages

# Manifests (kept so bun can resolve workspace metadata at runtime)
COPY --from=prod-deps /app/package.json ./
COPY --from=prod-deps /app/apps/server/package.json ./apps/server/

# Workspace package sources — overlays src/ on top of the node_modules
# trees brought in from prod-deps above.
COPY packages ./packages

# Server source + migrations
COPY apps/server/src ./apps/server/src
COPY apps/server/drizzle ./apps/server/drizzle
COPY apps/server/tsconfig.json ./apps/server/

WORKDIR /app/apps/server

USER bun

EXPOSE 3000

CMD ["bun", "run", "src/index.ts"]
