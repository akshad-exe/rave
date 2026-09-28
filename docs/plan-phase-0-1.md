# Plan — Phase 0 & 1: close T2 completely

**Goal:** take T2 from "verified but incomplete" to fully complete, and clear the documentation debt owed regardless of tier.

**Precondition:** the T1/T2 checker receipt must be green (`claimed T1 T2, verified T1 T2`). It is, as of `acceptance-report.txt`.

**Relationship:** Phases 0–1 are the highest-certainty work in the whole ladder — every item here closes a
requirement that is *already* implemented in the backend and merely undocumented or unexposed. Phase 2–3 are in
`plan-phase-2-3.md`.

---

## Before starting: verify one T1 assumption

`docs/tiers.md` marks T1 "Team formation by invite link" ✅ on thin evidence — the only file is
`apps/web/src/routes/(dashboard)/dashboard/teams/index.tsx`. Confirm it performs the real flow
(create invite → share link → accept) and not just a team roster.

```bash
# read the component and look for the invite + accept calls
grep -nE "createInvitation|acceptInvitation|invite" apps/web/src/routes/\(dashboard\)/dashboard/teams/index.tsx
```

- If invite **and** accept are both present → T1 is genuinely closed, proceed.
- If only a roster/list → that is a real T1 gap. Fix it in Phase 1 and re-check T1 before claiming it.

Do not skip this. T1 is the floor; the spec says a submission that misses it is not judged.

---

## Phase 0 — Documentation that closes a tier and a bonus

Ordered by value-per-hour. Item 0.1 is the single most valuable file in this plan.

### 0.1 `docs/JUDGING.md` — closes a T2 requirement *and* a +5 bonus

T2 requires cross-judge normalization "with your method documented and defended". The implementation already
exists (`results.compute`, per-judge z-score, `useNormalization` flag) but nothing defends it.

Must cover:

- The method: per-judge z-score across that judge's own submissions, then re-scaled to the event's score range
- **Why z-score and not raw mean** — judges differ in generosity and in how they use the scale
- The failure mode it fixes: one harsh judge dragging a project's mean down
- Its limits: with 3 reviews per project the estimate is noisy; it assumes judges are independent
- Worked example on real fixture output (feeds 0.2)

Evidence pointer: `apps/server/src/features/results/service.ts`, `packages/api/src/routers/results.ts`.

### 0.2 Normalization proof artifact — closes T2, claims the +5 bonus

A runnable script that proves the method on the fixture event rather than asserting it in prose.

- Input: `docs/dogfood/fixtures.json` (30 judges, 122 scores — the seeded set)
- Output: per-judge distribution stats, and the before/after spread per project
- Assert: score ordering is materially more stable after normalization
- Emit a committed `docs/dogfood/normalization-proof.txt`

The point is defensibility. A judge who asks "show me" gets a file, not a claim.

### 0.3 `docs/ARCHITECTURE.md`

- Monorepo shape: `packages/{api,auth,db,config,ui}` + `apps/{server,web}`
- oRPC contract-first flow: `packages/api` → `apps/server` router → `apps/web` client
- Why two entrypoints: the SPA plus plain-HTTP portal routes the checker probes
- Runtime: single compiled Bun binary in the image; note that this required
  `apps/server/src/composition/env-bootstrap.ts` to resolve env without the varlock CLI
- Data flow for a submission and for a score

### 0.4 `docs/DATA-MODEL.md`

Tables and their invariants, from `packages/db/src/schema`:

- `userProfile` · `event` · `track` · `prize` · `team` · `teamMember` · `submission` · `rubric` ·
  `rubricCriterion` · `judgeAssignment` · `score` · `vote` · `comment` · `auditLog`
- The uniqueness constraints that *are* the anti-abuse story:
  `vote_voter_submission`, `judge_assignment`, `score_assignment`
- Deadline enforcement via `assertSubmissionOpen` (server clock, hard 4xx)
- Role isolation as a data-visibility property, not a UI concern

**Phase 0 exit:** all four files exist and are committed. T2's "method documented" row flips 🟡 → ✅.

---

## Phase 1 — The last T2 gap: rubric UI

Backend is done: `rubrics.create` in `packages/api/src/routers/judging.ts`, per-track, weight-sum=100
enforced, `isWeighted` flag. It is simply not exposed.

### 1.1 Organizer rubric editor

- New route under `apps/web/src/routes/(organizer)/organizer/events/<id>/rubric/`
- Create/edit criteria per track: label, description, weight
- Live weight-sum indicator; block save unless the sum is exactly 100
- Toggle weighted vs unweighted, since the schema already carries `isWeighted`

### 1.2 Judge scoring view

- `apps/web/src/routes/(judge)/judge/scoring/index.tsx` must render the weighted rubric
- Show criterion weights, and compute the weighted total server-side — never in the client
- The judge's submitted scores stay locked to their own (existing `lockScores` behaviour)

**Phase 1 exit:** an organizer can build a weighted rubric through the UI, a judge scores against it, and the
weighted total matches `results.compute` on the server.

---

## Verification gate — run after *every* item

```bash
cd ~/Codebase/Hackathon/Dogfood/rave

bun run check                                    # lint
bunx turbo run check-types                       # expect 6/6
bunx turbo run build                             # expect 5/5
bunx turbo run test --filter=server --force      # expect >= 107, no regressions

cd docs/dogfood
python3 run.py ../../.dogfood.toml > ../../acceptance-report.txt
cd ../..
tail -3 acceptance-report.txt                    # must stay: verified T1 T2
```

**T1/T2 must remain 7/7 after every single change.** A drop is a regression, not a trade-off. Note that
Phase 1 touches the judge console, which the `T2 judge sees own scores` check exercises directly.

### Reproducing the receipt

The root `.env` (gitignored) must define `POSTGRES_PASSWORD` and `BETTER_AUTH_SECRET`, and
`apps/server/.env` must share that same secret. On a mismatch every authenticated check returns 401 — and
because a 401 is also a deny, the isolation checks still report PASS. Refresh cookies with
`bun run seed:config` after any secret change.

The stack must be running: `docker compose up -d`.

---

## Definition of done

- [ ] T1 team-invite flow verified as real (or fixed)
- [ ] `docs/JUDGING.md` written and defends the z-score method
- [ ] `docs/dogfood/normalization-proof.txt` generated from fixtures and committed
- [ ] `docs/ARCHITECTURE.md` written
- [ ] `docs/DATA-MODEL.md` written
- [ ] Organizer rubric editor functional, weight-sum validated
- [ ] Judge scoring view renders the weighted rubric
- [ ] Checker still 7/7 · 107+ tests · all gates green
- [ ] `docs/tiers.md` updated to reflect the new rows

**After this phase: T1 and T2 are fully complete**, and the Normalization Proof bonus (+5) is claimable with a
committed artifact rather than asserted in a README.
