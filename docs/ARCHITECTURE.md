# Architecture

## 1. Monorepo layout

```
rave/
├── apps/
│   ├── server/          # Bun HTTP server — oRPC + portal routes
│   └── web/             # Vite + React SPA
├── packages/
│   ├── api/             # oRPC contract (router definitions + input schemas)
│   ├── auth/            # Better Auth configuration, shared between server and web
│   ├── db/              # Drizzle schema + client factory
│   ├── config/          # Shared configuration helpers
│   └── ui/              # base-lyra component kit (base-ui primitives)
└── docs/
    └── dogfood/         # Acceptance fixture + checker
```

`packages/` contains no runtime servers — only types, schemas, and shared
logic.  `apps/` contains the two deployable units.

---

## 2. oRPC contract-first flow

The API contract is defined once in `packages/api` and consumed in two
directions without duplication:

```
packages/api/src/routers/       ← procedure definitions + input schemas
         │
         │  (imported by)
         ▼
apps/server/src/router.ts       ← mounts the contract, injects services
         │
         │  (HTTP over /rpc/*)
         ▼
apps/web/src/utils/orpc.ts      ← typed client, used with TanStack Query
```

A procedure definition in `packages/api` looks like:

```ts
export const teamsRouter = {
  createInvitation: protectedProcedure
    .route({ method: "POST", path: "/teams/{teamId}/invitations" })
    .input(createInvitationInput)
    .handler(({ context, input }) =>
      context.services.teams.createInvitation(context, input)
    ),
};
```

The handler receives a typed `context` containing the database client,
the authenticated session, and all service implementations.  The router
itself contains no business logic — enforcement happens in the service layer.

The web client is generated from the same `AppRouterClient` type:

```ts
export const client: AppRouterClient = createORPCClient(link);
export const orpc = createTanstackQueryUtils(client);
// Usage:
orpc.teams.createInvitation.mutationOptions()
orpc.rubrics.listByEvent.queryOptions({ input: { eventId } })
```

Because the client type is derived from the router, TypeScript catches
mismatched inputs and return types at compile time without a separate
code-generation step.

---

## 3. Two HTTP entrypoints

The server exposes two distinct surfaces:

### 3a. oRPC surface (`/rpc/*`)

All typed procedure calls from the web SPA use this path.  Requests are
NDJSON-over-POST (oRPC's default transport).  Authentication uses a session
cookie that Better Auth sets on sign-in.

### 3b. Portal routes (`/portal/*`)

Plain HTTP routes that respond to GET/POST with standard JSON.  They exist
because the dogfood acceptance checker (`docs/dogfood/run.py`) uses `curl`
and `httpx`, which cannot speak the oRPC framing.  The portal routes expose
a small subset of operations (gallery listing, submission deadline check, CSV
export, session/role seeding) in a format any HTTP client can consume.

These two surfaces share the same service layer and database — there is no
duplication of business logic.

---

## 4. Runtime: single compiled Bun binary

In production the server is compiled with `bun build --compile` into a single
self-contained binary (`/app/server`).  This has one significant consequence:
there is no `node_modules` directory and no varlock CLI available at runtime.

### env-bootstrap.ts

`apps/server/src/composition/env-bootstrap.ts` must be the **first** ES module
import in the server entry point.  The problem it solves:

1. ES modules evaluate all `import` statements before executing the importing
   module's body.  Any module that reads `ENV.PORT` at evaluation time beats
   any code the entry module tries to run first.
2. In development, `varlock/auto-load` runs the varlock CLI to populate `ENV`.
   In the compiled binary there is no CLI.
3. `env-bootstrap.ts` detects `NODE_ENV === "production"` and manually reads
   `.env.schema`, parses type annotations (`# @type=number`, `# @type=boolean`),
   coerces values, and injects them into `globalThis.__varlockLoadedEnv` before
   calling `initVarlockEnv({ allowFail: true })`.

This means `ENV.PORT` (a number) is available before any other module reads it,
and the server binds the correct port instead of a random one.

In development, `env-bootstrap.ts` is a no-op and varlock's auto-load runs
normally.

### Why env resolution does not depend on the varlock CLI

The varlock CLI lives in `node_modules/.bin/varlock`.  The compiled binary
contains no `node_modules`.  Therefore any code path that exec's the CLI
would fail immediately.  The bootstrap module avoids this by reading the
`.env.schema` file directly — it parses the same flat `KEY=value` format that
varlock uses, honoring the `# @type=` comment convention, and writes the result
into the structure varlock's runtime expects.

---

## 5. Data flows

### Submission flow

```
Participant (browser)
  │  POST /rpc/ → submissions.create
  ▼
apps/server  →  services.submissions.create
  │  1. requireUserId — session required
  │  2. assertSubmissionOpen — checks event.submissionDeadline vs server clock
  │     throws 400 if deadline has passed
  │  3. Enforce unique(teamId, eventId) — one submission per team per event
  │  4. Insert submission row (status = draft)
  │  5. writeAudit
  ▼
packages/db  →  submission table
```

The deadline check uses the **server clock**, not the client's.  A client
that submits with a manipulated timestamp still hits the server-side
`assertSubmissionOpen` guard.

### Score flow

```
Judge (browser)
  │  PUT /rpc/ → scoring.submit
  ▼
apps/server  →  services.scoring.submit
  │  1. requireExactRole("judge") — rejects non-judges at the service layer
  │  2. Load judgeAssignment — confirms the judge is assigned to this submission
  │  3. Isolation check — judge can only score their own assignment
  │  4. Validate criterionScores — every criterion present exactly once,
  │     within [minScore, maxScore] bounds
  │  5. Compute weighted totalScore = Σ(criterionScore × weight / 100)
  │  6. Upsert score row + update assignment status in one transaction
  ▼
packages/db  →  score table (totalScore stored for performance)

Later:
Organizer  →  POST /rpc/ → results.compute
  │  1. assertEventOrganizer
  │  2. Load all score.totalScore rows for the event
  │  3. If useNormalization: zScoreNormalize per judge → normalizedMap
  │  4. aggregateSubmissionResults → finalScore per submission
  │  5. assignRanks (overall + per-track)
  │  6. Upsert result rows in a transaction
  ▼
packages/db  →  result table
```

---

## 6. Role model

Roles live in `userProfile.role` (not in the session token).  The five roles
form a flat enumeration, not a hierarchy:

| Role | Can do |
|---|---|
| `visitor` | Read public content only |
| `participant` | Create teams, submit projects |
| `judge` | Score assigned submissions (own only) |
| `organizer` | Manage events, rubrics, assignments, lock scores |
| `admin` | Everything, plus role management |

Role enforcement is **not** a frontend concern.  Every sensitive procedure
calls `requireExactRole` or `assertEventOrganizer` inside the service function.
The UI hides inaccessible navigation items for usability, but a request with
the wrong role cookie reaches the same service-layer guards.

---

## 7. Database

Drizzle ORM with PostgreSQL.  Migrations run automatically on server start via
`drizzle-kit push` (development) or the migration runner in the composition
layer (production).

The connection string is provided via `POSTGRES_URL` from `.env` / the
bootstrap schema.  The `packages/db` package exports a `createDb(url)` factory
so both the server and any scripts can share the same Drizzle client setup
without circular imports.
