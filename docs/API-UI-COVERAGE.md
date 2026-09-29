# API / UI Coverage Audit

**Question:** can every action the API offers actually be performed through the web UI — and conversely, does
every UI action go through the API?

**Why it matters.** The DOGFOOD brief scores *Tier Completion & Correctness* at 40% and *"Adoptability &
Operability"* at 20%, and the acceptance checker reaches the system over HTTP, not through the UI. An operation
can therefore be fully implemented, unit-tested and checker-verified while being **unreachable by a person
clicking through the app**. That is the failure this audit exists to catch: this repository hit it repeatedly.

**Status:** 72 operations · 70 reachable from a real UI surface (97%) · 0 dead internal links · 24 route files ·
5 server-rendered portal routes (4 `GET` and 1 `POST`).

**This audit has been closed out.** It first recorded 33 of 70 reachable (47%). The remaining gaps were closed
in phases; the two operations still without a UI are deliberate, and are listed in section 4A.

---

## 1. Method

Reproducible, and no clever tooling. The count is deliberately based on **call sites**, not on mentions: a
`typeof client.foo.bar` in a type alias does not make an operation reachable.

```bash
# 1. operations the contract exposes (regenerate first if the routers changed)
bun run openapi

# 2. which are actually *called*, and not merely referenced in a type
grep -rhoE "(orpc|client)\.[a-zA-Z]+\.[a-zA-Z]+" apps/web/src \
  --include=*.ts --include=*.tsx | sort -u
```

Step 2 over-reports, and that is a known limitation rather than a hidden one: it matches
`ReturnType<typeof client.x.y>` type aliases as well as real calls. The reliable variant is to keep only
matches immediately followed by a call — `.queryOptions(`, `.mutationOptions(`, or a direct `client.x.y(` —
and to note the one irregular case, `orpc.me.queryOptions()`, where the router and operation share a name.

Two things this method deliberately does **not** count as coverage:

- A `useQuery` alone. Reading a screen is not being able to *act* on it.
- A call from `routes/_auth/dashboard.tsx`. That file is a leftover better-auth scaffold — it renders
  `API: {privateData.data?.message}` — and `_auth` is a pathless group excluded from the route tree. It is
  also a genuine duplicate of `/dashboard`, which `(dashboard)/dashboard.tsx` already claims.

The reverse direction was checked too. There is no `axios`, no `XMLHttpRequest`, no `localStorage` or
`sessionStorage` standing in for persistence, and no hand-rolled mutation anywhere in `apps/web/src`. The only
`fetch` in the tree is inside `apps/web/src/utils/orpc.ts` — the contract client itself. **Every UI data
access goes through the contract**, so the asymmetry is coverage, not discipline.

## 2. The two API surfaces

| Surface | Count | Reached by the SPA? |
|---|---|---|
| oRPC contract at `POST /rpc/*` | 72 | 70 |
| better-auth at `/api/auth/*` — `signIn`, `signUp`, `signOut`, `getSession`, `useSession` | 5 | yes |
| Server-rendered portal — `/gallery`, `/submissions`, `/judging/scores`, `/exports/scores.csv`, `/vote/:eventId` | 5 (4 `GET`, 1 `POST`) | n/a (they *are* the non-SPA surface) |

The auth endpoints are **not in `docs/openapi.json`**. They are better-auth's, and the spec's operationIds
are oRPC-only. A client generator built from our published spec would have no way to sign in. That is a real
gap in the *published* API, separate from UI coverage.

---

## 3. UI surface map

Every route file, and the operations it exercises. This is the map a reviewer should read first.

| Route file | Operations called |
|---|---|
| `routes/(dashboard)/dashboard/events/index.tsx` | `events.list` |
| `routes/(dashboard)/dashboard/submissions/index.tsx` | `submissions.mySubmissions` |
| `routes/(dashboard)/dashboard/teams/index.tsx` | `teams.acceptInvitation`, `teams.create`, `teams.createInvitation`, `teams.get`, `teams.leave`, `teams.listByEvent`, `teams.listInvitations`, `teams.removeMember`, `teams.revokeInvitation`, `teams.update` |
| `routes/(dashboard)/dashboard.tsx` | `events.list`, `submissions.mySubmissions`, `teams.myTeam` |
| `routes/(judge)/judge/assignments/index.tsx` | `assignments.myAssignments`, `assignments.myProgress` |
| `routes/(judge)/judge/index.tsx` | `assignments.myAssignments`, `assignments.myProgress` |
| `routes/(judge)/judge/scoring/index.tsx` | `assignments.getAssignedSubmission`, `assignments.myAssignments`, `rubrics.get`, `rubrics.listByEvent`, `scoring.getMyScore`, `scoring.submit` |
| `routes/(organizer)/organizer/admin/index.tsx` | `admin.auditLog`, `admin.listUsers`, `admin.platformAuditLog`, `admin.setRole`, `events.list` |
| `routes/(organizer)/organizer/events/$eventId/data/index.tsx` | `exports.assignments`, `exports.importAssignments`, `exports.importScores`, `exports.importSubmissions`, `exports.importTeams`, `exports.rawScores`, `exports.results`, `exports.submissions`, `exports.teams` |
| `routes/(organizer)/organizer/events/$eventId/judging/index.tsx` | `assignments.assign`, `assignments.batchAssign`, `assignments.judgePool`, `assignments.progress`, `scoring.allScores`, `submissions.gallery` |
| `routes/(organizer)/organizer/events/$eventId/results/index.tsx` | `events.revealResults`, `results.compute`, `results.getAdmin`, `results.getPublished`, `rubrics.listByEvent`, `scoring.allScores`, `scoring.lockScores`, `tracks.list` |
| `routes/(organizer)/organizer/events/$eventId/rubric/index.tsx` | `rubrics.create`, `rubrics.get`, `rubrics.listByEvent`, `tracks.list` |
| `routes/(organizer)/organizer/events/$eventId/settings/index.tsx` | `events.getAdmin`, `events.update`, `prizes.create`, `prizes.delete`, `prizes.list`, `tracks.create`, `tracks.delete`, `tracks.list`, `tracks.update` |
| `routes/(organizer)/organizer/events/index.tsx` | `events.list`, `events.transition` |
| `routes/(organizer)/organizer/events/new/index.tsx` | `events.create` |
| `routes/(organizer)/organizer/index.tsx` | `events.list` |
| `routes/gallery/index.tsx` | `events.list`, `submissions.gallery` |
| `routes/hackathons/$slug.tsx` | `events.getAdmin`, `events.getBySlug` |
| `routes/hackathons/index.tsx` | `events.list` |
| `routes/submissions/$id.tsx` | `comments.create`, `comments.delete`, `comments.list`, `submissions.disqualify`, `submissions.get`, `submissions.submit`, `submissions.update` |
| `routes/submit/index.tsx` | `events.list`, `submissions.create`, `teams.myTeam`, `tracks.list` |
| `routes/vote/$eventId.tsx` | `submissions.gallery`, `voting.counts`, `voting.myVotes`, `voting.unvote`, `voting.verifyVoting`, `voting.vote` |

Observations:

- **The judge console is complete.** Assign → view progress → score → submit.
- **The organizer console is now a full console.** Judging, results, data in and out, and settings, each
  reachable from the event row menu, plus platform administration for admins.

---

## 4. Operations with no UI, classified

2 of 72, both deliberate. Every gap this audit originally found has been closed.

### A. Deliberately not a UI concern (2)

| Operation | Why |
|---|---|
| `healthCheck` | Infrastructure probe. Not a person-facing action. |
| `privateData` | Only referenced by the better-auth scaffold, which is not a product surface. |

### B. What was closed, and what it cost

Each group below was a genuine gap. They are recorded because the way each was closed is not obvious from
the diff, and two of them needed a new API operation to be buildable at all.

| Group | Ops | Closed by | Note |
|---|---|---|---|
| Tier-relevant organizer gaps | 9 | `events/$eventId/judging`, `events/$eventId/results` | Progress, batch and single assignment, every score, compute, lock, reveal, public preview |
| Exports and imports | 9 | `events/$eventId/data` | 5 exports as buttons, 4 imports behind preview-then-commit |
| Event configuration | 7 | `events/$eventId/settings` | Details, schedule, tracks and prizes, all editable after creation |
| Team management | 6 | `dashboard/teams` | Roster, rename, member removal, invitation revocation, leaving |
| Platform administration | 4 | `organizer/admin` | Users and roles, platform audit log, per-event audit log |
| Judge pool | +1 op | `events/$eventId/judging` | `assignments.judgePool` had to be **added** — see below |

### C. Two operations could not be built without new API surface

Both were blockers of the same kind: the operation existed, but nothing reachable could supply its input.

- **`assignments.batchAssign` needed a judge pool.** There is no judge-to-event membership table, so
  `judgeAssignment` rows only exist once an assignment has been made, and the only user directory,
  `admin.listUsers`, is gated behind the admin role. A plain organizer could reach neither the initial judge
  list nor anyone with no prior assignments. Added `assignments.judgePool`, organizer-scoped, reporting each
  judge's current load.
- **`teams.revokeInvitation` needed an invitation list.** It takes an `invitationId` that no other operation
  returns, so a leaked invite link could not be revoked from the product at all. Added
  `teams.listInvitations`, scoped to the team owner.

Note on the second: revocation is **owner-only**, not organizer-only — the service asserts team ownership. So
the invite-link countermeasure in `THREAT_MODEL.md` belongs in the team owner's dialog, not an organizer
console. This corrected an earlier assumption in the coverage plan.

### D. Known limits of the current UI, stated rather than hidden

- **No per-project coverage number.** No reachable operation returns per-project assignment counts, so the
  judging console points at the per-judge progress table instead of showing coverage per project.
- **Team rosters show user ids.** `teams.get` returns members without names or emails.
- **Scores and the import preview cover submitted projects only.** `submissions.gallery` filters on
  `status = "submitted"`, and no organizer-facing list includes drafts.

---

## 5. Dead internal links

None. All four found in the first pass are closed:

| Link | Now |
|---|---|
| `/organizer/judging` | `/organizer/events/$eventId/judging`, per event, linked from the event row menu |
| `/organizer/participants` | Retired. No API behind it; team admin lives in the participant and event surfaces |
| `/organizer/analytics` | Retired. No API behind it at all |
| `/dashboard/teams/new` | Retargeted to `/dashboard/teams`, where team creation is a dialog |

A caution from finding these: an automated check written loosely reported **zero** broken links, because a
`startswith` fallback excused anything under `/organizer/`. The real list only came from checking each link by
hand. A future check has to resolve against the generated route tree, not approximate it.

---

## 6. What this means for the tier claims

The first pass of this audit found four rows in `tiers.md` marked done on API evidence a person would not
find: judge assignment, the progress dashboard, CSV export, and post-creation track and prize configuration.
All four now have screens, so the marks are honest.

| Tier row | Before | Now |
|---|---|---|
| Judge assignment and progress | API only | `events/$eventId/judging` |
| CSV export | API only | `events/$eventId/data` |
| Post-creation track and prize config | Not supported at all | `events/$eventId/settings` |
| Results and publishing | API only | `events/$eventId/results` |

Still accurate from the first pass, and not yet addressed:

- **better-auth's five endpoints are absent from `docs/openapi.json`.** A client generator built from the
  published spec has no way to sign in. Either document `/api/auth/*` alongside the oRPC operations, or note
  the absence in the spec itself.

---

## 7. Preventing a repeat

The original gap existed because the acceptance checker reaches the system over HTTP, so it cannot see whether
a person can reach a surface. Three things now guard against it returning:

1. **The drift test.** `src/tests/openapi-published.test.ts` fails when `docs/openapi.json` goes stale, which
   keeps this audit's inputs honest.
2. **A component library rather than per-page markup.** Eight shadcn primitives and a `Table` were added
   specifically so a new page composes from the system instead of reinventing controls, which is what made the
   raw-checkbox settings form possible in the first place.
3. **Still to do.** A test asserting a floor on "operations reachable from a route", and a dead-link check
   that resolves against the generated route tree. Neither is written; this document records the intent.
