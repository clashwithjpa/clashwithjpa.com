# syntax=docker/dockerfile:1.7

ARG NODE_VERSION=24-slim@sha256:3638d9a6fe4030bd716be989438248074489337ba3275657f93595428be4fc03
ARG TURBO_VERSION=2.10.8
ARG PNPM_VERSION=11.17.0

# ---- base ----------------------------------------------------------------
FROM node:${NODE_VERSION} AS base
ARG PNPM_VERSION
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable && corepack prepare pnpm@${PNPM_VERSION} --activate
WORKDIR /app

# ---- pruner: emit a workspace subset containing only server's deps -------
# `turbo prune` walks the workspace graph and emits, under /app/out:
#   json/  → just the package.jsons of in-graph workspaces (+ root)
#   full/  → those same workspaces with their source
#   pnpm-lock.yaml → a lockfile scoped to the pruned graph
FROM base AS pruner
ARG TURBO_VERSION
COPY . .
RUN pnpm dlx turbo@${TURBO_VERSION} prune server --docker

# ---- deps: install the full graph (dev included) so we can compile -------
FROM base AS deps

COPY --from=pruner /app/out/json/ ./
COPY --from=pruner /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=pruner /app/out/full/pnpm-workspace.yaml ./pnpm-workspace.yaml

RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile

# ---- build: compile TypeScript to plain JS -------------------------------
FROM deps AS build

COPY --from=pruner /app/out/full/ ./

# Builds in-graph workspace packages first (turbo `dependsOn: ["^build"]`),
# then the server: tsc emits to dist/, tsc-alias rewrites the @/* aliases and
# appends .js extensions so Node's ESM resolver can follow them.
RUN pnpm --filter server... run build

# ---- deploy: self-contained production tree ------------------------------
# `pnpm deploy` resolves the workspace graph into a standalone directory with a
# real node_modules containing only production dependencies. A plain
# `pnpm prune --prod` at the workspace root would prune against the *root*
# package.json (which holds only devDependencies) and strip the server's own
# runtime deps.
FROM build AS deploy
RUN pnpm deploy --filter=server --prod --legacy /app/deploy

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
