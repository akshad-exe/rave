# ── Build ────────────────────────────────────────────────────────────────────
# `bun build --compile` produces a single self-contained executable with the JS
# engine embedded, so the runtime stage needs no runtime and no node_modules.
# The previous image shipped the whole tree plus 714 MB of dependencies.
FROM oven/bun:1 AS build
WORKDIR /app

# Install from manifests only, so editing source does not invalidate this
# layer. `--frozen-lockfile` makes the build reproducible: without it a
# semver-compatible bump can be pulled in silently and the lockfile stops
# describing what is actually installed.
COPY package.json bun.lock bunfig.toml ./
COPY apps/server/package.json apps/server/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/api/package.json packages/api/package.json
COPY packages/auth/package.json packages/auth/package.json
COPY packages/config/package.json packages/config/package.json
COPY packages/db/package.json packages/db/package.json
COPY packages/ui/package.json packages/ui/package.json

# `bun install` runs a postinstall that generates each app's `src/env.ts` from
# its `.env.schema`, so the schemas must be present before installing.
COPY apps/server/.env.schema apps/server/.env.schema
COPY apps/web/.env.schema apps/web/.env.schema
COPY packages/db/.env.schema packages/db/.env.schema

RUN --mount=type=cache,target=/root/.bun/install/cache \
    bun install --frozen-lockfile

COPY . .

# Production mode matters at compile time, not just at runtime: the logger
# only attaches pino's `pino-pretty` worker transport when NODE_ENV is not
# "production", and that transport resolves `real-require` from disk, which
# cannot work inside a single-file executable.
ENV NODE_ENV=production
RUN cd apps/server && bun run compile

# ── Runtime ──────────────────────────────────────────────────────────────────
# The executable is dynamically linked against glibc, so it needs a base with
# glibc rather than `scratch`.
FROM debian:stable-slim AS runner
WORKDIR /app
ENV NODE_ENV=production

# ca-certificates is not in the slim base; without it any outbound TLS (and
# postgres with sslmode=require) fails at runtime rather than at build. curl is
# here to serve the compose healthcheck, since this image deliberately ships no
# node runtime for it to shell out to.
RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates curl \
    && rm -rf /var/lib/apt/lists/*

# Migrations are plain SQL on disk and are deliberately not bundled, so they
# have to be copied in. `resolveMigrationsFolder` probes, in order:
#   $MIGRATIONS_FOLDER  ->  <cwd>/../../packages/db/src/migrations
#   ->  /app/packages/db/src/migrations
# The last candidate is what makes the path below load-bearing: the server runs
# migrations on boot and throws if it cannot find them.
COPY --from=build /app/packages/db/src/migrations packages/db/src/migrations
# Same story for the dogfood fixtures: they are data, not code, so they are not
# bundled. The seeder probes FIXTURES_PATH, then `<cwd>/docs/dogfood`, then
# `/app/docs/dogfood`, and throws if none resolve.
COPY --from=build /app/docs/dogfood docs/dogfood
# env-bootstrap resolves the environment from this file at startup, so the
# compiled image needs it alongside the binary.
COPY --from=build /app/apps/server/.env.schema apps/server/.env.schema
COPY --from=build /app/apps/server/server ./server

# Run unprivileged. This base has no `node` user, so create one.
RUN groupadd --system --gid 1001 rave \
    && useradd --system --uid 1001 --gid rave --no-create-home rave \
    && chown -R rave:rave /app
USER rave

EXPOSE 3000

# exec-form, so the binary is PID 1 and receives SIGTERM directly; compose also
# sets `init: true` for zombie reaping.
CMD ["/app/server"]
