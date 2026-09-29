# API / UI Coverage Audit

**Question:** can every action the API offers actually be performed through the web UI — and conversely, does
every UI action go through the API?

**Why it matters.** The DOGFOOD brief scores *Tier Completion & Correctness* at 40% and *"Adoptability &
Operability"* at 20%, and the acceptance checker reaches the system over HTTP, not through the UI. An operation
can therefore be fully implemented, unit-tested and checker-verified while being **unreachable by a person
clicking through the app**. That is the failure this audit exists to catch: this repository hit it repeatedly.

**Status at the time of writing:** 70 operations · 33 reachable from a real UI surface (47%) · 4 genuinely dead
internal links · 18 route files · 5 server-rendered portal routes.

---

## 1. Method

Reproducible, and no clever tooling — the numbers come from grep over the tree.

```bash
# operations the contract exposes (regenerate first if the routers changed)
bun run openapi

# which of them the web app actually calls
grep -rhoE "orpc\.[a-zA-Z]+\.[a-zA-Z]+" apps/web/src --include=*.ts --include=*.tsx | sort -u

# which routes actually exist
grep -rhoE 'createFileRoute\(\s*"[^"]+"' apps/web/src/routes --include=*.ts --include=*.tsx

# which internal links resolve
grep -rhoE '(to|href)="[^"]+"' apps/web/src --include=*.tsx
```

Two things this method deliberately does **not** count as coverage:

- A `useQuery` alone. Reading a screen is not being able to *act* on it.
- A call from `routes/_auth/dashboard.tsx`. That file is a leftover better-auth scaffold — it renders
  `API: {privateData.data?.message}` — and `_auth` is a pathless group excluded from the route tree.

The reverse direction was checked too. There is no `axios`, no `XMLHttpRequest`, no `localStorage` or
`sessionStorage` standing in for persistence, and no hand-rolled mutation anywhere in `apps/web/src`. The only
`fetch` in the tree is inside `apps/web/src/utils/orpc.ts` — the contract client itself. **Every UI data
access goes through the contract**, so the asymmetry is coverage, not discipline.

---

## 2. The two API surfaces

| Surface | Count | Reached by the SPA? |
|---|---|---|
| oRPC contract at `POST /rpc/*` | 70 | 33 |
| better-auth at `/api/auth/*` — `signIn`, `signUp`, `signOut`, `getSession`, `useSession` | 5 | yes |
| Server-rendered portal — `/gallery`, `/submissions`, `/judging/scores`, `/exports/scores.csv`, `/vote/:eventId` | 5 | n/a (they *are* the non-SPA surface) |

The auth endpoints are **not in `docs/openapi.json`**. They are better-auth's, and the spec's operationIds
are oRPC-only. A client generator built from our published spec would have no way to sign in. That is a real
gap in the *published* API, separate from UI coverage.

---

## 3. UI surface map

Every route file, and the operations it exercises. This is the map a reviewer should read first.

| Route file | Operations called |
|---|---|
| `routes/index.tsx` | `events.list` |
| `routes/gallery/index.tsx` | `events.list`, `submissions.gallery` |
| `routes/hackathons/index.tsx` | `events.list` |
| `routes/hackathons/$slug.tsx` | `events.getBySlug`, `events.getAdmin` |
| `routes/submit/index.tsx` | `events.list`, `submissions.create`, `teams.myTeam`, `tracks.list` |
| `routes/submissions/$id.tsx` | `submissions.get`, `submissions.update`, `submissions.submit`, `comments.list`, `comments.create`, `comments.delete` |
| `routes/vote/$eventId.tsx` | `submissions.gallery`, `voting.counts`, `voting.myVotes`, `voting.vote`, `voting.unvote`, `voting.verifyVoting` |
| `routes/(dashboard)/dashboard.tsx` | `events.list`, `submissions.mySubmissions`, `teams.myTeam` |
| `routes/(dashboard)/dashboard/events/index.tsx` | `events.list` |
| `routes/(dashboard)/dashboard/submissions/index.tsx` | `submissions.mySubmissions` |
| `routes/(dashboard)/dashboard/teams/index.tsx` | `teams.listByEvent`, `teams.create`, `teams.createInvitation`, `teams.acceptInvitation` |
| `routes/(judge)/judge/index.tsx` | `assignments.myAssignments`, `assignments.myProgress` |
| `routes/(judge)/judge/assignments/index.tsx` | `assignments.myAssignments`, `assignments.myProgress` |
| `routes/(judge)/judge/scoring/index.tsx` | `assignments.myAssignments`, `assignments.getAssignedSubmission`, `rubrics.get`, `rubrics.listByEvent`, `scoring.getMyScore`, `scoring.submit` |
| `routes/(organizer)/organizer/index.tsx` | `events.list` |
| `routes/(organizer)/organizer/events/index.tsx` | `events.list`, `events.transition` |
| `routes/(organizer)/organizer/events/new/index.tsx` | `events.create` |
| `routes/(organizer)/organizer/events/$eventId/rubric/index.tsx` | `rubrics.listByEvent`, `rubrics.get`, `rubrics.create`, `tracks.list` |

Two observations that the table makes obvious:

- **The judge console is complete.** Assign → view progress → score → submit. It is the most finished
  surface in the app.
- **The organizer console is a shell.** Four route files, of which one creates events, one lists and phases
  them, and one builds a rubric. Everything else an organizer is expected to do — assign judges, watch
  progress, inspect scores, publish results, export, manage participants — has no screen at all.

---

## 4. Operations with no UI, classified

37 of 70. Grouped by whether that is a decision or a gap.

### A. Deliberately not a UI concern (2)

| Operation | Why |
|---|---|
| `healthCheck` | Infrastructure probe. Not a person-facing action. |
| `privateData` | Only referenced by the better-auth scaffold, which is not a product surface. |

### B. Platform administration — no surface exists (4)

| Operation | Note |
|---|---|
| `admin.setRole` | **No user or role management screen exists at all.** Roles are seeded; a live organizer cannot promote anyone. |
| `admin.listUsers` | As above. |
| `admin.auditLog` | Per-event audit log. Built, audited against, and unreachable. |
| `admin.platformAuditLog` | Platform-wide variant. Same. |

### C. Tier-relevant gaps in the organizer console (9)

This group is the one that matters. Each of these is implemented, tested, and in `docs/openapi.json` — and
none is reachable by a user.

| Operation | Tier row it underpins | UI state |
|---|---|---|
| `assignments.assign` | T2 — judge invitation and assignment | **absent** |
| `assignments.batchAssign` | T2 — same, and the coverage planner | **absent** |
| `assignments.progress` | T2 — *"live organizer progress dashboard so an organizer can see who has not started"* | **absent**, and `/organizer/judging` is a dead link pointing exactly here |
| `scoring.allScores` | T2 — organizers see submitted scores | **absent** |
| `scoring.lockScores` | T2 — scores can be locked at the end of judging | **absent** |
| `results.compute` | T2 — normalization output | **absent** |
| `results.getAdmin` | T2 — organizer results view | **absent** |
| `results.getPublished` | T2 — public results | **absent** |
| `events.revealResults` | T2 — reveal results when the organizer is ready | **absent** |

### D. Exports and imports — no UI at all (9)

`exports.assignments`, `exports.rawScores`, `exports.results`, `exports.submissions`, `exports.teams`,
`imports.submissions`, `imports.scores`, `imports.teams`, `imports.assignments`.

The portal serves `GET /exports/scores.csv` on the API origin, and the acceptance checker uses it, so
"CSV export works" passes. **There is no export button anywhere in the app**, and no way to trigger a bulk
import from the UI. A judge looking for the migration path has to know the URL.

### E. Team management — create and invite only (5)

`teams.get`, `teams.update`, `teams.leave`, `teams.removeMember`, `teams.revokeInvitation`.

The dashboard can create a team, mint an invitation link and accept one. A participant **cannot leave a team**,
and an organizer **cannot remove a member or revoke an invitation** they issued. Revoking is the direct
countermeasure to the invite-link abuse in `docs/THREAT_MODEL.md`, and it has no UI.

### F. Event configuration after creation (7)

`events.update`, `tracks.create`, `tracks.update`, `tracks.delete`, `prizes.create`, `prizes.list`,
`prizes.delete`.

T1 asks for *"event creation with configurable dates, tracks and prizes"*. An event can be created, and the
rubric editor lists tracks — but **no track or prize can be created, renamed or removed through the UI**, and
an event's dates and deadline cannot be edited after creation. Every one of these is also what a bulk import
would reference, so the migration path is half-wired: the data can arrive by CSV but not be shaped by hand.

### G. Submissions (1)

`submissions.disqualify` — an organizer can mark a submission disqualified, but not from the UI.

---

## 5. Dead internal links

Four. Three of them are the **Quick Actions** on the organizer dashboard — the first thing an organizer, or a
judge, clicks.

| Link | Label | Resolves? |
|---|---|---|
| `/organizer/participants` | Manage Participants | **no** |
| `/organizer/judging` | Configure Judging | **no** |
| `/organizer/analytics` | View Analytics | **no** |
| `/dashboard/teams/new` | (from the participant dashboard) | **no** |

The existing organizer routes are `/organizer`, `/organizer/events`, `/organizer/events/new` and
`/organizer/events/$eventId/rubric`. Nothing else.

---

## 6. What this means for the tier claims

`docs/tiers.md` records each row's evidence. Re-reading it against this audit, four rows are marked ✅ on
**API** evidence while a person clicking through the app would not find the feature:

| `docs/tiers.md` row | Marked | Actually |
|---|---|---|
| Judge invitation and assignment | ✅ | API only. No assignment UI. |
| Organizer judge-progress dashboard | ✅ | API only. No screen, and the link to it is dead. |
| CSV export throughout the workflow | ✅ | API + portal URL only. No button. |
| Event creation with configurable dates, tracks, prizes | ✅ (partly) | Creation works; configuring tracks and prizes afterwards has no UI. |

This is not a regression — the earlier rows were accurate *as statements about the API*, and the API is
genuinely strong. It is a gap between what the contract can do and what a person can do, and the acceptance
checker cannot see it because it drives HTTP directly.

The honest summary: **T1 and T2 are real at the API and verified by the checker; the organizer experience
needed to *operate* T2 is mostly not built.** Nothing here is wrong, but it is unfinished, and a judge who
clicks "Configure Judging" finds nothing.

---

## 7. Recommendations, in order

Ordered by tier impact per hour, not by size.

1. **Delete or build the three dead Quick Actions.** Three dead links on the first screen a judge sees is the
   cheapest reputational fix available. Judging is the one with a real destination — it becomes screen 1.
2. **A judging screen for organizers** — one route at `/organizer/judging` that calls `assignments.progress`,
   `assignments.batchAssign` and `scoring.allScores`. This closes five of the nine tier-relevant gaps at once,
   and turns a dead link into the strongest surface in the app.
3. **Export buttons** on the organizer event page, linking the five existing CSV routes. Turns an
   API-only T2 row into something a person can use, and the URLs are already documented in `.dogfood.toml`.
4. **Track and prize management** on the event page. Closes the T1 configuration row and gives bulk import
   something to import *into*.
5. **Team leave and invitation revoke** in the participant and organizer team views. Small, and it closes the
   countermeasure to invite-link abuse named in the threat model.
6. **Publish the auth endpoints in the spec.** Either document `/api/auth/*` alongside the oRPC operations or
   note its absence in `docs/openapi.json`, so a client generator is not misled.
7. **Keep the drift test, and add a coverage assertion.** `src/tests/openapi-published.test.ts` already fails
   when the spec goes stale. A test asserting a floor on "operations reachable from a route" would make this
   class of gap visible in CI rather than in a manual audit.

Items 1 and 2 are the ones I would do before anything else. They are small, and they change what a judge sees
in the first five minutes.
