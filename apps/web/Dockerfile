# syntax=docker/dockerfile:1.7

ARG BUN_VERSION=1.3.10
ARG NGINX_VERSION=1.27-alpine

# ---- base ----------------------------------------------------------------
FROM oven/bun:${BUN_VERSION}-alpine AS base
WORKDIR /app

# ---- deps: install full workspace dependencies (incl. dev) ---------------
# Vite needs devDependencies to build, so we install the full graph here.
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

# ---- build: produce the static SvelteKit output --------------------------
FROM base AS build

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/web/node_modules ./apps/web/node_modules
COPY --from=deps /app/packages ./packages

COPY package.json bun.lock turbo.json ./
COPY apps/web ./apps/web
COPY packages ./packages

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
