ARG NODE_IMAGE=node:24-slim@sha256:0e0ff40c39bc087845bfb27465a0df4ea419520094bc35842ff83dd8cbe6f9b6

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
# The lockfile lists web as an importer, so its manifest must exist for a frozen
# install. Its sources stay out, so web-only edits don't rebuild this image.
COPY apps/web/package.json ./apps/web/
COPY apps/server ./apps/server
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm install --frozen-lockfile --filter "server..."
RUN pnpm --filter "server..." run build
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm deploy --filter server --prod /out

FROM ${NODE_IMAGE} AS runtime
ENV NODE_ENV=production \
    PORT=3000
WORKDIR /app
COPY --from=build /out ./
# Optional and untracked. The bracket glob lets the COPY match nothing instead
# of failing when the lookup hasn't been generated.
COPY apps/server/scripts/migrations/datasets/import_lookup.jso[n] ./scripts/migrations/datasets/
USER node
EXPOSE 3000
HEALTHCHECK --interval=15s --timeout=5s --start-period=60s --retries=3 \
    CMD ["node", "-e", "fetch(`http://127.0.0.1:${process.env.PORT}/`).then((r) => process.exit(r.ok ? 0 : 1), () => process.exit(1))"]
CMD ["sh", "-c", "node dist/migrate-prod.js && exec node --import ./dist/lib/instrument.js dist/index.js"]
