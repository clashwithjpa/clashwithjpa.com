# Frontend Builder
FROM node:22-alpine AS frontend
WORKDIR /app
COPY . .
RUN npm install -g pnpm && pnpm install
RUN pnpm run build && pnpm prune --prod

# Final Image
FROM node:22-alpine
LABEL name="clashwithjpa" \
    description="clashwithjpa frontend" \
    url="https://github.com/clashwithjpa/clashwithjpa.com"

RUN apk add --no-cache curl

# Set working directory
WORKDIR /clashwithjpa

# Copy frontend build from the previous stage
COPY --from=frontend  /app/build /clashwithjpa/build
COPY --from=frontend  /app/node_modules /clashwithjpa/node_modules
COPY --from=frontend  /app/package.json /clashwithjpa/package.json

# Add the entrypoint script
COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
CMD ["node", "/clashwithjpa/build"]