# syntax=docker/dockerfile:1.26@sha256:ecfaec9ed6d810b56388c508f4121597bfbba70d41a6dfeee4d8cad5f295fc32

ARG NODE_VERSION=24-slim@sha256:0e0ff40c39bc087845bfb27465a0df4ea419520094bc35842ff83dd8cbe6f9b6
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

# ---- pruner: emit a workspace subset containing only server's deps -------
# `turbo prune` walks the workspace graph and emits, under /app/out:
#   json/  → just the package.jsons of in-graph workspaces (+ root)
#   full/  → those same workspaces with their source
#   pnpm-lock.yaml → a lockfile scoped to the pruned graph
FROM base AS pruner
ARG TURBO_VERSION
COPY . .
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm dlx turbo@${TURBO_VERSION} prune server --docker

# ---- libs: compile the @repo/* packages the server imports ---------------
# `@repo/auth-shared` has peer deps, so pnpm *injects* it: node_modules gets a
# copy of the package as it looked at install time, not a symlink to it. An
# install that runs before the sources are in place therefore copies nothing but
# a package.json, and the server build can't resolve the package at all. Build
# the libraries here, then install in the build stage once dist/ exists.
FROM base AS libs

COPY --from=pruner /app/out/json/ ./
COPY --from=pruner /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=pruner /app/out/full/pnpm-workspace.yaml ./pnpm-workspace.yaml

RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile --filter "server^..."

COPY --from=pruner /app/out/full/packages/ ./packages/

RUN pnpm --filter "server^..." run build \
    && mkdir /libs \
    && cp -r --parents packages/*/dist /libs/

# ---- build: compile TypeScript to plain JS -------------------------------
FROM base AS build

COPY --from=pruner /app/out/json/ ./
COPY --from=pruner /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=pruner /app/out/full/pnpm-workspace.yaml ./pnpm-workspace.yaml
COPY --from=pruner /app/out/full/packages/ ./packages/
COPY --from=libs /libs/ ./

# tsc and the migration tooling are devDependencies, so install the full graph.
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile

# Last, so that editing the server leaves every layer above this one cached.
COPY --from=pruner /app/out/full/ ./

# tsc emits to dist/, tsc-alias rewrites the @/* aliases and appends .js
# extensions so Node's ESM resolver can follow them.
RUN pnpm --filter server run build

# ---- deploy: self-contained production tree ------------------------------
# `pnpm deploy` resolves the workspace graph into a standalone directory with a
# real node_modules containing only production dependencies. A plain
# `pnpm prune --prod` at the workspace root would prune against the *root*
# package.json (which holds only devDependencies) and strip the server's own
# runtime deps. Requires `injectWorkspacePackages: true` in pnpm-workspace.yaml.
FROM build AS deploy
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm deploy --filter=server --prod /app/deploy

# ---- runtime -------------------------------------------------------------
FROM node:${NODE_VERSION} AS runtime
WORKDIR /app

ENV NODE_ENV=production \
    PORT=3000

# Only the production install tree and compiled output are carried over —
# no TypeScript, no sources, no build tooling in the final image.
COPY --from=deploy /app/deploy ./apps/server

# Read at runtime by the account-import endpoint. It is a generated artifact
# and may legitimately be absent — the bracket glob makes this COPY a no-op in
# that case, and the endpoint already degrades to a warning when the file is
# missing. A literal path here would hard-fail the build instead.
COPY --from=pruner /app/out/full/apps/server/scripts/migrations/dataset[s]/ \
     ./apps/server/scripts/migrations/datasets/

WORKDIR /app/apps/server

RUN chmod +x docker-entrypoint.sh

USER node

EXPOSE 3000

CMD ["./docker-entrypoint.sh"]
