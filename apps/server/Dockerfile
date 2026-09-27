FROM oven/bun:1 AS builder
WORKDIR /app

COPY . .
RUN --mount=type=cache,target=/root/.bun/install/cache bun install

ENV NODE_ENV=production
RUN cd apps/server && bun run build

FROM node:24-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app /app

EXPOSE 3000

WORKDIR /app/apps/server
CMD ["node", "dist/index.mjs"]
