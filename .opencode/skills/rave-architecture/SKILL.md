---
name: rave-architecture
description: How the Rave monorepo fits together and which of its seams break silently. Covers the two API surfaces, the portal route table as source of truth, migrations-on-boot, varlock env, and the tooling traps that let a broken build exit 0. Use when changing anything in apps/server, packages/api, packages/db, or the web app's data flow, and before concluding that "the build passed".
user-invocable: true
---

# Rave architecture

Self-hostable hackathon submission and judging platform. Bun + Turborepo monorepo.

| Path | Role |
|---|---|
| `apps/server` | Fastify + oRPC + Better Auth. **All** domain logic and authz lives here. |
| `apps/web` | React 19 / TanStack Router. A client; holds no business rules. |
| `packages/api` | Zod schemas, oRPC routers, and the `Services` contract the server implements. |
| `packages/auth` | Better Auth instance (Drizzle adapter, `plugins: []`). |
| `packages/db` | Drizzle schema, relations, SQL migrations. 20 tables. |
| `packages/ui` | Component kit, `base-lyra` style (base-ui, not Radix). |
| `packages/config` | Shared tsconfig. |

## Two API surfaces, one set of rules

1. **oRPC** — typed routers in `packages/api/src/routers/*`, generates the OpenAPI
   document. Used by the web app.
2. **Portal** — plain HTTP at `apps/server/src/features/portal/route.ts`, with a
   server-rendered HTML gallery. Exists because oRPC's RPC framing is unusable
   for `curl`, shareable links, and the acceptance checker.

Both call the **same services**, so behaviour cannot drift. If you add a rule, put
it in a service under `apps/server/src/features/*`, never in a route handler.

`PORTAL_ROUTES` in `apps/server/src/features/portal/paths.ts` is the single source
of truth for portal paths. `.dogfood.toml` is **generated** from it
(`bun run seed:config`) so the acceptance checker and the server cannot disagree.
Never hand-edit `.dogfood.toml`.

## Authz: routers are thin, services enforce

Almost every procedure is only `protectedProcedure` (is there a session?). Role
enforcement is deliberately pushed down into the services:

- `requireExactRole(ctx, "judge")` — exact match, no hierarchy. Used for
  judge-only views so an organizer's higher rank cannot reach them.
- `assertEventOrganizer(ctx, eventId)` — event owner or co-organizer.
- `resolveRole(ctx)` — reads `user_profile.role`, defaults to `participant`.

`role` lives in a **separate `user_profile` table**, not in Better Auth's `user`
table, deliberately. Consequence: the Better Auth session carries **no role**,
and no oRPC procedure currently returns the caller's role. Anything that needs the
caller's role on the client has no endpoint today.

## Seams that break silently

**`vite build` can exit 0 while producing a broken app.** The TanStack route
generator runs in a Vite plugin hook; when a route file fails to parse, the
generator throws, `routeTree.gen.ts` is *not* regenerated, and Vite carries on
building the stale tree. Check that the route count is what you expect:

```bash
grep -c "'/" apps/web/src/routeTree.gen.ts   # 21 routes when healthy
```

`routeTree.gen.ts` is **gitignored** and regenerated on dev/build, so its absence
from a diff is normal; a stale one on disk is not.

**`check-types` is topological, so a dependency failure hides its dependents.**
`turbo.json` sets `dependsOn: ["^check-types"]`. While `@rave/ui` was broken, turbo
aborted and `web:check-types` never ran — 172 web type errors were invisible
rather than absent. When a package fails, verify the packages *after* it in the
graph were actually checked.

**`bun check` and `check-types` are different questions.** `bun check` is
ultracite/Biome: lint and format, with only shallow inference. `check-types` is
`tsc`. Biome accepts `orpc.events.list.queryOptions({ limit: 5 })`; `tsc` rejects
it. Lint clean does not mean types clean.

## Data and env

- Migrations apply programmatically on server boot (`packages/db/src/migrate.ts`),
  so a fresh volume converges with no separate step. Applied rows land in
  `drizzle.__drizzle_migrations`. Generate with `bun run db:generate`.
- Env is typed end to end by **varlock**: each app declares `.env.schema`, and
  `bun install` runs codegen to produce `src/env.ts` (gitignored). If `env.ts`
  looks wrong, re-run `bunx varlock codegen --path ./apps/web/`.
- Never write `process.env.X` in app code — use the generated `ENV` proxy.

## Gates

```bash
bun check          # lint + format, must be 0 errors
bun run check-types
bun run build
cd apps/server && bun run test    # needs POSTGRES_PASSWORD to match apps/server/.env
```
