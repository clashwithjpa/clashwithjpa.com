# syntax=docker/dockerfile:1.7

ARG BUN_VERSION=1.3.10
ARG TURBO_VERSION=2.8.17

# ---- base ----------------------------------------------------------------
FROM oven/bun:${BUN_VERSION}-alpine AS base
WORKDIR /app

# ---- pruner: emit a workspace subset containing only server's deps -------
# `turbo prune` walks the workspace graph and emits, under /app/out:
#   json/  → just the package.jsons of in-graph workspaces (+ root)
#   full/  → those same workspaces with their source
#   bun.lock → a lockfile scoped to the pruned graph
# This replaces the hand-maintained list of `COPY <pkg>/package.json` lines
# and means the deps layer only invalidates on package.json changes in
# workspaces server actually depends on.
FROM base AS pruner
ARG TURBO_VERSION
COPY . .
RUN bunx turbo@${TURBO_VERSION} prune server --docker

# ---- prod-deps: install only production dependencies ---------------------
FROM base AS prod-deps

COPY --from=pruner /app/out/json/ ./
COPY --from=pruner /app/out/bun.lock ./bun.lock

RUN --mount=type=cache,target=/root/.bun/install/cache \
    bun install --frozen-lockfile --production --ignore-scripts

# ---- runtime -------------------------------------------------------------
FROM oven/bun:${BUN_VERSION}-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production \
    PORT=3000

# Bring the prod install tree first (root + per-workspace node_modules),
# then overlay the pruned source — out/full has no node_modules so the
# install tree is preserved.
COPY --from=prod-deps /app/ ./
COPY --from=pruner /app/out/full/ ./

WORKDIR /app/apps/server

USER bun

EXPOSE 3000

CMD ["bun", "run", "src/index.ts"]
