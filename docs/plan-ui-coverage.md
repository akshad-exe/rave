# Plan — UI Coverage: build the screens the API already supports

**Goal:** close the gap measured in [`API-UI-COVERAGE.md`](API-UI-COVERAGE.md), where 37 of 70 operations are
unreachable from the product.

**Why this plan exists.** The API is strong and the acceptance checker verifies it over HTTP, so an operation can
be implemented, unit-tested and checker-verified while no person can reach it. That gap is invisible to the
checker by construction. Four rows in `tiers.md` are currently marked done on API evidence alone.

**Ordering rule.** Phase order is by *tier impact per hour*, not by size. A dead link on the first screen a judge
clicks costs more than a large internal tool. Stop after any phase and the tree is still coherent.

**Standing rules for every phase.**
- Reuse the existing organizer pattern: `routes/(organizer)/organizer/events/$eventId/<feature>/index.tsx`,
  reading `Route.useParams()` for the event. The `(organizer)` layout already gates by role via `beforeLoad`.
- Build only from primitives in `packages/ui/src/components` (`card`, `table`-less — use the `EventRow` table
  pattern already in the events list, `dialog`, `select`, `input`, `textarea`, `tabs`, `alert`, `badge`,
  `dropdown-menu`, `empty`, `skeleton`, `toast`).
- Every new surface gets a loading skeleton, an empty state, and an error state. The judge console is the
  reference for quality.
- No new dependency. Hand-rolled where needed, as with the CSV parser.
- Each phase ends with the full gate suite and a regenerated `docs/openapi.json`.

---

## Coverage ledger

Kept here so progress is measurable. "Reachable" means a person can complete the action through the UI.

| Phase | Operations closed | Status | Reachable after |
|---|---|---|---|
| Start | — | — | 33 / 70 (47%) |
| 0 — Judge console | 5 | ✅ done | 38 / 70 (54%) |
| 1 — Results & lifecycle | 5 | ✅ done | 43 / 70 (61%) |
| 2 — Data in and out | 9 | ✅ done | 52 / 70 (74%) |
| 3 — Event configuration | 7 | ✅ done | 59 / 70 (84%) |
| 4 — Team & submission admin | 6 | ✅ done | 65 / 70 (92%) |
| 5 — Platform administration | 4 | ✅ done | 69 / 70 (98%) |
| 6 — Regression guard | 0 | ✅ done | 70 / 72 (97%) |

Phases 0–5 are complete and verified against the seeded fixture, and every operation each phase promised was
checked to exist in the contract. Phase 6 is the one item left, and it is the only one that was never about
building a screen.

Two phases needed new API surface before their UI could exist, which the estimates above did not anticipate:
`assignments.judgePool` in phase 0, and `teams.listInvitations` in phase 4. In both cases the operation already
existed but nothing reachable could supply its input.

The contract also grew twice while the phases were being built, so the denominator moved: 70 → 72.

| | Operations |
|---|---|
| Reachable | **70** |
| Deliberately not | 2 — `healthCheck` (an infrastructure probe) and `privateData` (a better-auth scaffold) |

**Verified final position: 70 of 72 (97%).** See [`API-UI-COVERAGE.md`](API-UI-COVERAGE.md) for the
per-route map and the method.

---

## Phase 0 — Judge console for organizers  ✅

**Closes 5 operations · kills 1 dead link · ~3h · no dependencies**

The single highest-value phase. `/organizer/judging` is a dead link today, and it is exactly where the missing
surface belongs.

**New:** `routes/(organizer)/organizer/events/$eventId/judging/index.tsx`

| Section | Operations | Notes |
|---|---|---|
| Progress | `assignments.progress` | The T2 row: per-judge completion, who has not started. Reuse the `byJudge` breakdown the service already returns. |
| Assignment | `assignments.batchAssign` | Judge pool multi-select, `reviewsPerSubmission` target, then a plan preview from the returned `assigned`/`skipped` before committing. **Show the skip reasons** — `own_submission`, `own_team`, `already_assigned`, `judge_pool_exhausted` — because that is the audit trail for a coverage decision. |
| Single assign | `assignments.assign` | Add or remove one judge/project pair. |
| Scores | `scoring.allScores` | Per project, with each judge's score. Organizer-only already enforced server-side. |

**Also:**
- Point the "Configure Judging" Quick Action at `/organizer/events/$eventId/judging`.
- Add a judging link to the event list row, beside the rubric link.
- **Decide the other two Quick Actions.** `/organizer/participants` and `/organizer/analytics` have no
  destination today. Either build a thin participants view (Phase 4 reuses it for team admin) or remove the
  cards. Leaving two dead links on the dashboard to fix one is not a fix.

**Done when:** an organizer can, without leaving the page, assign judges, see who has not started, inspect every
score, and read why any project is short of reviewers.

---

## Phase 1 — Results and the judging lifecycle  ✅

**Closes 5 operations · ~3h · requires Phase 0**

Completes the T2 loop: Phase 0 assigns and collects, this phase closes and publishes.

**New:** `routes/(organizer)/organizer/events/$eventId/results/index.tsx`

| Control | Operation | Notes |
|---|---|---|
| Compute | `results.compute` | Runs the per-judge z-score. Show the result before it is stored, not after. |
| Admin view | `results.getAdmin` | Full table: raw mean, normalized score, rank movement. `JUDGING.md` §5 has a worked example to match. |
| Lock | `scoring.lockScores` | Freeze scores. Irreversible, so put it behind a `Dialog` confirmation, not a button. |
| Reveal | `events.revealResults` | Publish. Same confirmation treatment. |
| Public view | `results.getPublished` | Preview of what the public will see once revealed — otherwise "reveal" is a leap of faith. |

**Also:** a public results route, or reuse the server-rendered portal pattern from `/gallery` so results are
readable without JavaScript, consistent with how the gallery and ballot are handled.

**Done when:** an organizer can compute, inspect, lock and reveal results, and preview the public view first.

---

## Phase 2 — Data in and out  ✅

**Closes 9 operations · ~4h · no dependencies (can run in parallel with 0/1)**

This is the Adoptability criterion — *"a migration path in and out, a platform you cannot leave is a trap"* — and
currently the only way in or out is knowing a URL.

**Exports (5).** Buttons on the event page linking the existing portal CSV routes. The endpoints already exist
and are already in `.dogfood.toml`; this is wiring, not new API. `exports.assignments`, `rawScores`, `results`,
`submissions`, `teams`.

**Imports (4).** A `tabs` panel on the event page: `imports.submissions`, `imports.scores`, `imports.teams`,
`imports.assignments`.

The flow, for each kind:
1. File picker → read as text client-side.
2. **Validate locally before uploading** — parse with the same RFC 4180 rules the server uses, and show
   row-level problems with their spreadsheet line numbers.
3. `dryRun: true` against the server, so the count that *would* be created/updated/skipped is reviewed first.
4. Confirm, then `dryRun: false`.
5. Render the returned `errors[]` verbatim — per-row, with line numbers, not a single failure toast.

**Note:** the local preview and the server `dryRun` are not redundant. The first catches a malformed file
before any network call; the second is authoritative about the database. Skip the first and an organizer waits
on a round trip to learn their CSV is broken.

**Done when:** an organizer can export any of the five CSVs and import any of the four, seeing a preview and
per-row errors before writing anything.

---

## Phase 3 — Event configuration  ✅

**Closes 7 operations · ~4h · no dependencies**

T1 asks for *"event creation with configurable dates, tracks and prizes"*. Today an event is created once and
never edited: no track or prize can be created, renamed or removed, and the deadline is immutable.

**Event settings** — `events.update`. Dates, deadline, description, visibility. **Deadline edits are the
sensitive part:** changing one retroactively invalidates work already done, so show what submissions exist and
confirm explicitly.

**Tracks** — `tracks.create`, `tracks.update`, `tracks.delete`. The rubric page already reads
`tracks.list`; give it a management affordance, or a sibling page. Deleting a track that has submissions is
referential-integrity territory — surface the count before the click.

**Prizes** — `prizes.create`, `prizes.list`, `prizes.delete`. Currently no surface at all, not even a read.

**Why it matters beyond the checklist:** bulk import (Phase 2) references `track_id` and produces teams and
submissions. An organizer importing into an event with no tracks and no prizes has nothing to import *into*.
Phase 2 without Phase 3 is a one-way door with no shelves.

**Done when:** an organizer can edit an event's dates and deadline, and manage its tracks and prizes, after
creation.

---

## Phase 4 — Team and submission administration  ✅

**Closes 6 operations · ~3h · no dependencies**

Team management stops at create-invite-accept. A participant cannot leave, and an organizer cannot remove a
member or revoke an invitation they issued.

**Participant view** (`dashboard/teams`) — `teams.update` (rename), `teams.leave`, `teams.get` (roster with
member count). Leaving needs a confirmation that says what happens to the team's submission.

**Organizer view** — `teams.removeMember`, `teams.revokeInvitation`, `teams.listByEvent`.

**`teams.revokeInvitation` is the priority.** Invite links are a 72-hour bearer token, and revoking a leaked one
is the direct countermeasure to the invite-link abuse in `THREAT_MODEL.md`. Today the countermeasure does not
exist in the UI, so the threat model is describing a control nobody can reach.

**Submissions** — `submissions.disqualify`, on the submission page for organizers, with a required reason
(`disqualifySubmissionInput` takes an optional `reason`, max 500). Disqualifying a project is consequential
and visible in the gallery, so it belongs behind a confirmation that names the project.

**Also:** `/dashboard/teams/new` is a dead link. Either build the create flow there or point it at the existing
create action on the teams page.

**Done when:** a participant can manage and leave their own team, an organizer can remove members and revoke
invitations, and a submission can be disqualified with a recorded reason.

---

## Phase 5 — Platform administration  ✅

**Closes 4 operations · ~3h · no dependencies**

No user, role or audit surface exists. Roles are seeded; a live organizer cannot promote anyone, and the audit
log — which `JUDGING.md` §9 and the threat model both lean on — cannot be read from the product.

**Users and roles** — `admin.listUsers`, `admin.setRole`. A table with a role selector. `setRole` is
privileged, so the role change is a `Dialog` confirmation and the existing `admin.set_role` audit entry records
who did it.

**Audit log** — `admin.auditLog` (per event) and `admin.platformAuditLog` (platform-wide). Filter by actor,
resource type, action and date. This is the *"an audit trail an organizer can actually read"* line in the
Judging Integrity criterion — and the whole anti-abuse story rests on it.

**Placement:** `routes/(admin)/…` with its own role guard, or under `(organizer)` if organizers are intended to
read it. Decide from the intent — a per-event audit log arguably belongs beside the event, a platform-wide one
does not.

**Done when:** a role can be changed from the UI and the audit log is readable and filterable without a database
client.

---

## Phase 6 — Regression guard  ✅

**~1h · prevents the whole class of bug**

The audit was manual. A manual audit does not run in CI, which is how this recurred.

Delivered in `apps/server/src/tests/api-ui-coverage.test.ts` (8 assertions):

1. **A reachability allowlist, not just a floor.** Every operation in the spec must either be called from
   `apps/web/src/**` at a real call site, or appear in `DELIBERATELY_UNREACHABLE` with a reason. An allowlist
   catches a *newly added* operation with no screen, which a bare minimum threshold would miss until enough
   operations were added to push the count back under the line.
2. **A stale-allowlist check**, so a deleted operation cannot linger as a permanent exemption.
3. **A dead-link check.** Resolved paths come from `fullPath` in the generated `routeTree.gen.ts`, which is the
   only field that has route groups already stripped, and `$param` segments match one segment. Failures name
   the file and line.
4. **A vacuity guard.** The first version of the dead-link check passed while examining zero links, because its
   ignore-pattern contained a bare `\/` and every internal route starts with one. An assertion on how many links
   are extracted makes that failure mode loud instead of silent.
5. **Call sites only.** A bare `orpc.foo.bar` is ambiguous, because the same expression appears in type aliases
   such as `Awaited<ReturnType<typeof client.x.y>>`; counting those would report coverage that does not exist.

**Fault-injection verified.** A near-miss link (`/organizer/events/nope`), a new uncovered operation, and a
renamed allowlist key each fail the suite with an actionable message, and the suite returns to green once the
fault is reverted.

**Not done:** item 3 of the original plan — a `tiers.md` convention tying a ✅ to a reachable operation. That is
a documentation change and was left alone rather than made unasked. The enforcement now lives in code, which is
strictly stronger than a convention.

---

## Suggested sequencing

```
Phase 0  ──┬──> Phase 1  ──>  (T2 judging loop complete)
           │
Phase 2  ──┤
           ├──> Phase 3  ──>  (migration path has somewhere to land)
           │
Phase 4  ──┤
Phase 5  ──┤
           │
Phase 6  ──┘  (do this early, not last — it is what stops the rest eroding)
```

Phase 0 first: it is the dead link, it closes five tier-relevant gaps, and it is the surface a judge would most
want to see. Phase 6 is listed last but **do it second** — it is an hour, and it is what keeps the other six
honest.

## What to skip

If time runs short, stop after Phase 0 and Phase 2. That is a coherent, defensible product: a working organizer
judging console, and a real migration path in and out. The remaining phases are genuine gaps but none of them
breaks a journey a judge can complete.

Do not start Phase 5 (platform admin) before Phase 0. It is the least user-facing work in the plan and the first
thing to be cut.
