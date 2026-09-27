# Rave

A self-hostable hackathon submission and judging platform: registration, team
formation, submissions, eligibility, judge assignment, scoring, normalization,
results, and certificates — the full pipeline an organizer needs to run an
event.

Built to run locally with a single command and no external services.

## Quick start

```bash
docker compose up
```

That builds the images, starts PostgreSQL, applies migrations, and serves:

| Service         | URL                     |
| --------------- | ----------------------- |
| Web (frontend)  | http://localhost:3001   |
| Server (API)    | http://localhost:3000   |
| Database        | `localhost:5432`        |

No cloud account, hosted database, authentication provider, or external API is
required. Migrations run automatically on server boot, so the stack is usable
against a brand-new volume.

> The first boot generates a development `BETTER_AUTH_SECRET`. For anything
> beyond local use, set your own via `apps/server/.env` or the
> `BETTER_AUTH_SECRET` environment variable.

## Running locally without Docker

Requires [Bun](https://bun.sh) and a PostgreSQL instance.

```bash
cp apps/server/.env.example apps/server/.env
cp apps/web/.env.example apps/web/.env
# set BETTER_AUTH_SECRET to any string of 32+ characters
bun install
bun run db:start   # start just PostgreSQL
bun run dev        # run server + web
```

`bun install` runs `varlock codegen`, which generates the typed environment
modules from each app's `.env.schema`.

## Tests

```bash
docker compose up -d postgres   # tests use a dedicated rave_test database
cd apps/server && bun run test
```

The suite applies migrations to `rave_test` and truncates it between runs, so it
never touches development data. `docker/postgres-init` creates the database on
first boot. Override the connection with `TEST_DATABASE_URL`.

Quality gates:

```bash
bun run check-types   # tsc across the workspace
bun run check         # Biome / Ultracite lint + format
```

## Architecture

A Bun monorepo managed with Turborepo.

| Path            | What it is                                                  |
| --------------- | ----------------------------------------------------------- |
| `apps/web`      | React + TanStack Router frontend, served in production by nginx |
| `apps/server`   | Fastify + oRPC server, Better Auth, Zod contracts            |
| `packages/api`  | Shared Zod schemas and the oRPC contract                     |
| `packages/auth` | Better Auth server instance                                  |
| `packages/db`   | Drizzle ORM schema, relations, migrations                    |
| `packages/config` | Shared TypeScript configuration                            |

API procedures are written once in `packages/api` and served over oRPC. The same
contract generates the OpenAPI document, so the docs cannot drift from the code.

Configuration is typed end to end by [varlock](https://varlock.dev): each app
declares its environment in an `.env.schema` file, and the generated `env.ts`
module exposes those values with types and defaults resolved.

### Database migrations

Migrations live in `packages/db/src/migrations` and are applied by the server on
boot through drizzle-orm's programmatic migrator, so a fresh volume converges
without a separate migration step. Applied migrations are recorded in
`drizzle.__drizzle_migrations`.

To create a migration after changing a schema:

```bash
bun run db:generate   # writes SQL into packages/db/src/migrations
```

## License

[MIT](./LICENSE)
