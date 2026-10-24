ARG NODE_IMAGE=node:24-slim@sha256:0e0ff40c39bc087845bfb27465a0df4ea419520094bc35842ff83dd8cbe6f9b6
ARG CADDY_IMAGE=caddy:2.11-alpine@sha256:eb4d35b7452d1ab6171fbdbe8d9275b2301dad6dad92115d91e19fb9b24d510f

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

FROM ${CADDY_IMAGE} AS runtime
# Where the Caddyfile fetches /meta link-preview cards. The public API by default; the
# full stack points it at the API container instead (docker-compose.yaml).
ARG PUBLIC_SERVER_URL
ENV API_UPSTREAM=${PUBLIC_SERVER_URL}
COPY apps/web/Caddyfile /etc/caddy/Caddyfile
COPY --from=build /app/apps/web/build /srv
EXPOSE 80
HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
    CMD ["wget", "-q", "--spider", "http://127.0.0.1/healthz"]
