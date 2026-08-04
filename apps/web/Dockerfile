# syntax=docker/dockerfile:1.7

ARG NODE_VERSION=24-slim
ARG NGINX_VERSION=1.27-alpine
ARG TURBO_VERSION=2.10.8
ARG PNPM_VERSION=11.17.0

# ---- base ----------------------------------------------------------------
FROM node:${NODE_VERSION} AS base
ARG PNPM_VERSION
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable && corepack prepare pnpm@${PNPM_VERSION} --activate
WORKDIR /app

# ---- pruner: emit a workspace subset containing only web's deps ----------
FROM base AS pruner
ARG TURBO_VERSION
COPY . .
RUN pnpm dlx turbo@${TURBO_VERSION} prune web --docker

# ---- deps: install full workspace dependencies (incl. dev) ---------------
# Vite needs devDependencies to build, so we install the full graph here.
FROM base AS deps

COPY --from=pruner /app/out/json/ ./
COPY --from=pruner /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=pruner /app/out/full/pnpm-workspace.yaml ./pnpm-workspace.yaml

RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile

# ---- build: produce the static SvelteKit output --------------------------
FROM deps AS build

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

RUN pnpm --filter web... run build

# ---- runtime: nginx serving the prerendered static output ----------------
FROM nginx:${NGINX_VERSION} AS runtime

COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/web/build /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
