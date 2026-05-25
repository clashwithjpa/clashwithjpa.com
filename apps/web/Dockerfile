# syntax=docker/dockerfile:1.7

ARG BUN_VERSION=1.3.10
ARG NGINX_VERSION=1.27-alpine
ARG TURBO_VERSION=2.8.17

# ---- base ----------------------------------------------------------------
FROM oven/bun:${BUN_VERSION}-alpine AS base
WORKDIR /app

# ---- pruner: emit a workspace subset containing only web's deps ----------
# `turbo prune` walks the workspace graph and emits, under /app/out:
#   json/  → just the package.jsons of in-graph workspaces (+ root)
#   full/  → those same workspaces with their source
#   bun.lock → a lockfile scoped to the pruned graph
# This replaces the hand-maintained list of `COPY <pkg>/package.json` lines
# and means the deps layer only invalidates on package.json changes in
# workspaces web actually depends on.
FROM base AS pruner
ARG TURBO_VERSION
COPY . .
RUN bunx turbo@${TURBO_VERSION} prune web --docker

# ---- deps: install full workspace dependencies (incl. dev) ---------------
# Vite needs devDependencies to build, so we install the full graph here.
FROM base AS deps

COPY --from=pruner /app/out/json/ ./
COPY --from=pruner /app/out/bun.lock ./bun.lock

RUN --mount=type=cache,target=/root/.bun/install/cache \
    bun install --frozen-lockfile --ignore-scripts

# ---- build: produce the static SvelteKit output --------------------------
FROM base AS build

# Bring node_modules from `deps` first, then overlay the pruned source.
# `out/full/` doesn't contain node_modules, so the install tree is preserved.
COPY --from=deps /app/ ./
COPY --from=pruner /app/out/full/ ./

# PUBLIC_* env vars are embedded at build time by Vite/SvelteKit.
# Pass them through as build args so the resulting bundle is environment-specific.
ARG PUBLIC_SERVER_URL
ARG PUBLIC_SENTRY_DSN
ARG PUBLIC_SENTRY_SPOTLIGHT
ARG PUBLIC_TURNSTILE_SITE_KEY
ENV PUBLIC_SERVER_URL=${PUBLIC_SERVER_URL} \
    PUBLIC_SENTRY_DSN=${PUBLIC_SENTRY_DSN} \
    PUBLIC_SENTRY_SPOTLIGHT=${PUBLIC_SENTRY_SPOTLIGHT} \
    PUBLIC_TURNSTILE_SITE_KEY=${PUBLIC_TURNSTILE_SITE_KEY} \
    NODE_ENV=production

WORKDIR /app/apps/web
RUN bun run build

# ---- runtime: nginx serving the prerendered static output ----------------
FROM nginx:${NGINX_VERSION} AS runtime

COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/web/build /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
