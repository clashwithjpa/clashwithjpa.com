# syntax=docker/dockerfile:1.26@sha256:ecfaec9ed6d810b56388c508f4121597bfbba70d41a6dfeee4d8cad5f295fc32

ARG NODE_VERSION=24-slim@sha256:0e0ff40c39bc087845bfb27465a0df4ea419520094bc35842ff83dd8cbe6f9b6
ARG NGINX_VERSION=1.31-alpine@sha256:c8497b180665e631ec92a5091125bec5b214f0e2b99409e30653a125b37557da
ARG TURBO_VERSION=2.10.13
ARG PNPM_VERSION=12.4.2

# ---- base ----------------------------------------------------------------
FROM node:${NODE_VERSION} AS base
ARG PNPM_VERSION
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
ENV HUSKY=0
# `pnpm --version` makes corepack fetch pnpm's native binary now, baking it into
# this layer instead of leaving every stage that runs pnpm to download its own.
RUN corepack enable && corepack prepare pnpm@${PNPM_VERSION} --activate \
    && pnpm --version
WORKDIR /app

# ---- pruner: emit a workspace subset containing only web's deps ----------
FROM base AS pruner
ARG TURBO_VERSION
COPY . .
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm dlx turbo@${TURBO_VERSION} prune web --docker

# ---- libs: compile the @repo/* packages web imports ----------------------
# injectWorkspacePackages (set for the server image's `pnpm deploy`) makes an
# install *copy* each workspace package into node_modules rather than symlink
# it, so their dist/ has to exist before the build stage installs.
FROM base AS libs

COPY --from=pruner /app/out/json/ ./
COPY --from=pruner /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=pruner /app/out/full/pnpm-workspace.yaml ./pnpm-workspace.yaml

RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile --filter "web^..."

COPY --from=pruner /app/out/full/packages/ ./packages/

RUN pnpm --filter "web^..." run build \
    && mkdir /libs \
    && cp -r --parents packages/*/dist /libs/

# ---- build: produce the static SvelteKit output --------------------------
FROM base AS build

COPY --from=pruner /app/out/json/ ./
COPY --from=pruner /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=pruner /app/out/full/pnpm-workspace.yaml ./pnpm-workspace.yaml
COPY --from=pruner /app/out/full/packages/ ./packages/
COPY --from=libs /libs/ ./

# Vite needs devDependencies to build, so we install the full graph here.
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile

# Last, so that editing web leaves every layer above this one cached.
COPY --from=pruner /app/out/full/ ./

# PUBLIC_* env vars are embedded at build time by Vite/SvelteKit.
ARG PUBLIC_SERVER_URL
ARG PUBLIC_SENTRY_DSN
ARG PUBLIC_SENTRY_SPOTLIGHT
ARG PUBLIC_TURNSTILE_SITE_KEY
ENV PUBLIC_SERVER_URL=${PUBLIC_SERVER_URL} \
    PUBLIC_SENTRY_DSN=${PUBLIC_SENTRY_DSN} \
    PUBLIC_SENTRY_SPOTLIGHT=${PUBLIC_SENTRY_SPOTLIGHT} \
    PUBLIC_TURNSTILE_SITE_KEY=${PUBLIC_TURNSTILE_SITE_KEY} \
    NODE_ENV=production

RUN pnpm --filter web run build

# ---- runtime: nginx serving the prerendered static output ----------------
FROM nginx:${NGINX_VERSION} AS runtime

COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/web/build /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
