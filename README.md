# Rave

A self-hostable hackathon submission and judging platform: registration, team
formation, submissions, eligibility, judge assignment, scoring, normalization,
results, and certificates — the full pipeline an organizer needs to run an
event.

Built to run locally with a single command and no external services.

## Quick start

```bash
bun run setup        # creates apps/server/.env with a generated secret
docker compose up
```

`setup` is idempotent and never overwrites an existing `.env`, so re-running it
is safe and will not invalidate sessions that are already signed.

`docker compose up` builds the images, starts PostgreSQL, applies migrations, and
serves:

| Service         | URL                     |
| --------------- | ----------------------- |
| Web (frontend)  | http://localhost:3001   |
| Server (API)    | http://localhost:3000   |
| Database        | `localhost:5432`        |

No cloud account, hosted database, authentication provider, or external API is
required. Migrations run automatically on server boot, so the stack is usable
against a brand-new volume.

### The secret, and why it lives in one file

`bun run setup` writes a random 48-byte `BETTER_AUTH_SECRET` into
`apps/server/.env`, and that file is the **only** place the secret is defined.
Compose passes it to the server through `env_file`, which is why the server block
deliberately does **not** also set `BETTER_AUTH_SECRET` under `environment:`.
In Compose, `environment` wins over `env_file`; setting it in both once meant the
host minted session cookies with one secret while the container verified them
with another, so every authenticated request returned 401 — and because a 401 is
also a deny, the isolation checks still reported a pass. If you add a secret to
either place, delete it from the other.

The seeded `POSTGRES_PASSWORD` default (`ravepass`) is shared by
`docker-compose.yml` and `apps/server/.env.example`. Change one and you must
change the other, or a fresh volume is created with a password the host does not
expect.

For anything beyond local use, replace the generated secret and serve behind
TLS.

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

## Seeded demo data

The server seeds `docs/dogfood/fixtures.json` on every boot. Inserts ignore
conflicts, so a fresh volume gets the fixture and an existing one is left
alone. Two fixture rows cannot be stored and are reported on startup:

- `prj_41` — its team already submitted `prj_07`, and a team may submit once
  per event.
- 4 scores for `prj_41` — a score hangs off a submission, so these have nothing
  to attach to.

The server also signs in as one organizer, two judges, and one participant, and
prints a `Cookie:` header per role. Those headers are what the acceptance
checker uses, so `.dogfood.toml` is generated rather than hand-written:

```bash
bun run seed:config   # writes .dogfood.toml at the repo root
python3 docs/dogfood/specs/run.py .dogfood.toml
```

Use `DOGFOOD_BASE_URL` if the portal is not on `http://localhost:3000`; set the
same value in `PORT` for the server. The `fixtures.json` symlink at the repo
root points at `docs/dogfood/fixtures.json` so the checker finds the fixture
without a `--fixtures` flag.

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
