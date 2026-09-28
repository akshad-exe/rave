# ── Build ────────────────────────────────────────────────────────────────────
FROM oven/bun:1 AS build
WORKDIR /app

# Install from manifests only, so editing source does not invalidate this
# layer. `--frozen-lockfile` makes the build reproducible.
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

# VITE_SERVER_URL is baked into the client bundle at build time, so it has to be
# a build arg rather than a runtime environment variable. It is not a secret.
ARG VITE_SERVER_URL
ENV VITE_SERVER_URL=${VITE_SERVER_URL}
ENV NODE_ENV=production

RUN cd apps/web && bun run build

# ── Runtime ──────────────────────────────────────────────────────────────────
# The app compiles to static files, so nginx serves them and nothing else. The
# builder stage is discarded; the shipped image is this stage alone.
FROM nginx:alpine AS runner

COPY --from=build /app/apps/web/dist /usr/share/nginx/html
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf

# The bundled default nginx.conf runs as root and its pid/log paths point at
# /var/run and /var/log/nginx. Unprivileged nginx needs those redirected, and
# the html/cache dirs made writable, before dropping privileges.
RUN set -eux; \
    touch /var/run/nginx.pid; \
    chown -R nginx:nginx /var/run/nginx.pid /var/cache/nginx /usr/share/nginx/html; \
    sed -i 's,^pid .*,pid /tmp/nginx.pid;,' /etc/nginx/nginx.conf; \
    sed -i 's,/var/run/nginx.pid,/tmp/nginx.pid,g' /etc/nginx/nginx.conf

USER nginx

EXPOSE 80

# `daemon off` keeps nginx in the foreground so it is PID 1 and receives
# SIGTERM; compose also sets `init: true` for zombie reaping.
CMD ["nginx", "-g", "daemon off;"]
