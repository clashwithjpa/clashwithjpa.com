# syntax=docker/dockerfile:1.26@sha256:ecfaec9ed6d810b56388c508f4121597bfbba70d41a6dfeee4d8cad5f295fc32

ARG NODE_IMAGE=node:24-slim@sha256:0e0ff40c39bc087845bfb27465a0df4ea419520094bc35842ff83dd8cbe6f9b6
ARG NGINX_IMAGE=nginx:1.31-alpine@sha256:c8497b180665e631ec92a5091125bec5b214f0e2b99409e30653a125b37557da

FROM ${NODE_IMAGE} AS base
ENV PNPM_HOME=/pnpm \
    PATH=/pnpm:$PATH \
    COREPACK_ENABLE_DOWNLOAD_PROMPT=0 \
    CI=true
WORKDIR /app
COPY package.json ./
# Pins pnpm to the root `packageManager` and bakes it into this layer, so later
# stages never download it again.
RUN corepack enable && corepack install

FROM base AS build
COPY pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages ./packages
# The lockfile lists server as an importer, so its manifest must exist for a
# frozen install. Its sources stay out, so server-only edits don't rebuild this.
COPY apps/server/package.json ./apps/server/
COPY apps/web ./apps/web
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm install --frozen-lockfile --filter "web..."
# PUBLIC_* values are inlined into the bundle, so they are fixed per image.
ARG PUBLIC_SERVER_URL \
    PUBLIC_SENTRY_DSN \
    PUBLIC_SENTRY_SPOTLIGHT \
    PUBLIC_TURNSTILE_SITE_KEY
RUN NODE_ENV=production pnpm --filter "web..." run build

FROM ${NGINX_IMAGE} AS runtime
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/web/build /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
    CMD ["wget", "-q", "--spider", "http://127.0.0.1/healthz"]
