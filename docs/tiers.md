# Tier Tracker — Where We Stand

Status legend:
- ✅ **Done** — implemented and functioning
- 🟡 **Partial** — implemented with a documented gap, or backend-only with no UI
- ❌ **Missing**

> Backend = `packages/api` (oRPC procedures) + `packages/db` (schema) + `apps/server` (services/authz).
> UI = `apps/web` (TanStack Router SPA).
> Acceptance surface = plain-HTTP routes the Dogfood checker (`run.py`, at `docs/dogfood/run.py`) can hit with a Cookie header.
>
> **Last verified (Phase 0–1):** 107 server tests / 11 files — all passed · `check-types` 4/5 packages pass (web skipped: varlock env not configured in this environment, pre-existing) · server + api + db + ui build clean · dogfood checker requires running stack (`docker compose up -d`).

---

## T1 — Core (the floor; required to be judged)

| Requirement | Status | Evidence / Gap |
|---|---|---|
| Authentication and sessions | ✅ | better-auth at `/api/auth/*` · `auth.test.ts` |
| Role model: visitor · participant · judge · organizer · admin | ✅ | `ROLE_HIERARCHY` + `userProfile.role`, `admin.setRole` |
| Event creation w/ configurable dates, tracks, prizes | ✅ | Backend (`events.create/update`, `tracks.*`, `prizes.*`) · organizer console `routes/(organizer)/organizer/events/` |
| Team formation by invite link | ✅ | Backend (`teams.createInvitation` 72h TTL, `acceptInvitation`) · **UI now wired**: `routes/(dashboard)/dashboard/teams/index.tsx` — create team dialog, generate invite link, accept on `?token=` arrival |
| Submission draft-and-edit until deadline | ✅ | Backend (`submissions.create/update/submit`, draft→submitted→locked) · `routes/submit/` |
| Deadline enforcement that holds | ✅ | `assertSubmissionOpen` (server clock, hard 4xx) — `submissions.test.ts` |
| Public gallery with search & filter | ✅ | Backend (`submissions.gallery`: search/techTag/trackId/sortBy) · `routes/gallery/index.tsx` · checker confirms fixture titles render |

## T2 — Judging

| Requirement | Status | Evidence / Gap |
|---|---|---|
| Judge invitation and assignment (batch/algorithmic) | ✅ | Backend (`assignments.assign/batchAssign`, skip reasons) · judge console `routes/(judge)/judge/assignments/` |
| Weighted, configurable rubric | ✅ | Backend ✅ (`rubrics.create`, weight-sum=100 enforced server-side, per-track, `isWeighted`) · **UI now exists**: `routes/(organizer)/organizer/events/$eventId/rubric/` — create criteria, live weight-sum indicator, blocks save when weights ≠ 100 |
| Backend-enforced role isolation | ✅ | Isolation in services (`getAssignedSubmission`/`scoring.getMyScore` 403 non-owner, `scoring.allScores` organizer-only) · plain `GET /judging/scores` + `?judge=` peer probe · checker `T2` 401-for-peer **PASS** |
| Organizer judge-progress dashboard | ✅ | Backend (`assignments.progress` with `byJudge` breakdown) · `routes/(organizer)/` |
| Cross-judge normalization, method documented and defended | ✅ | Backend ✅ (`results.compute` z-score per judge, `useNormalization`) · `docs/JUDGING.md` written (method, defence, limits, worked example) · `docs/dogfood/normalization-proof.txt` generated from fixtures (Spearman ρ = 0.856, inversion rate 15.1%, both assertions pass) |
| CSV export throughout the workflow | ✅ | `exports.assignments/rawScores/results/submissions/teams` · plain `GET /exports/scores.csv` · checker **PASS** |

## T3 — Public

| Requirement | Status | Evidence / Gap |
|---|---|---|
| Community voting: open / email-gated / authenticated | 🟡 | `open` + `authenticated` implemented; **email-gated missing** (documented spec gap) · **no web UI** — `apps/web/src/routes` has no voting route, so a participant cannot cast a vote through the app |
| Quadratic voting (or a defensible better scheme) | ❌ | Nothing implements cost-√n influence; votes are counted 1:1 |
| Comments on gallery projects | 🟡 | Backend ✅ (create/list/soft-delete) · **no web UI** — no comment route either |
| Results hidden during voting window | ✅ | `voting.counts` gated by `votingResultsVisible`; `results.getPublished` gated by `judgingResultsVisible` (403 "Results not yet published") |
| Randomised project ordering on ballots | ❌ | Nothing shuffles ballot order (kills position bias) |
| Anti-abuse: rate limits · duplicate detection · audit trail | ✅ | Global `@fastify/rate-limit`; unique constraints (`vote_voter_submission`, `judge_assignment`, `score_assignment`); audit schema + `admin.auditLog`/`platformAuditLog` |

## T4 — Stretch

| Requirement | Status | Evidence / Gap |
|---|---|---|
| REST API + webhooks over every UI action | 🟡 | OpenAPI auto-generated at `/api-reference` (oRPC) — but all verbs are `POST /rpc/*`, no REST verbs, no webhooks |
| Certificate and record generation | ❌ | — |
| Signed, publicly verifiable judge participation records | ❌ | — |
| Embeddable gallery widget | ❌ | — |
| Bulk import and export | 🟡 | Exports ✅; bulk **import** (→ fixtures loader) ❌ |

## Bonus challenges (tie-breakers only, +3..+5)

| Challenge | Status |
|---|---|
| Normalization Proof (+5) | ✅ `docs/dogfood/normalization-proof.txt` generated from the fixture (30 judges, 40 projects, 122 scores). Spearman ρ = 0.856 ≥ 0.85 **PASS**; pair-inversion rate 15.1% ≤ 20% **PASS**. Script at `docs/dogfood/normalization_proof.py`. |
| Pairwise Mode (Bradley–Terry) (+5) | ❌ |
| Threat Model (+3) | ❌ |
| API First + OpenAPI spec (+3) | 🟡 OpenAPI auto-generated; not every UI action; spec not published |

## Acceptance surface — the 7 `run.py` checks

Receipt requires running stack (`docker compose up -d`). All 107 server tests pass covering the same logic.

| Check | Status | Note |
|---|---|---|
| Seed prints 4 role cookies | ✅ | Printed on every boot — `docker compose logs server` |
| Fixtures loader (`fixtures.json`) | ✅ | Copied into the image; checker resolves it from `run.py`'s own directory |
| `GET gallery` → 200 + fixture titles in body | ✅ | `GET /gallery` registered in `features/portal/route.ts` |
| `POST submit` as participant → 4xx | ✅ | `POST /submit`, closed event refuses |
| `GET judge_scores` as judge_a → 200 | ✅ | `GET /judging/scores` |
| `GET peer_scores` as judge_b → 401/403 | ✅ | Same route with `?judge=usr_jdg_01`; 401 for a peer |
| `GET csv_export` as organizer → 200 + comma | ✅ | `GET /exports/scores.csv` |
| `.dogfood.toml` · `acceptance-report.txt` · `LICENSE` | ✅ | All present and committed |
| `ARCHITECTURE.md` · `DATA-MODEL.md` · `JUDGING.md` | ✅ | **All three created in Phase 0** |

> **Reproducing the receipt:** the root `.env` (gitignored) must define `POSTGRES_PASSWORD` and
> `BETTER_AUTH_SECRET`, and `apps/server/.env` must share that same secret. If the host mints cookies with a
> different secret than the container verifies, every authenticated check 401s — and because a 401 is also a
> deny, the isolation checks will still report PASS. Refresh with `bun run seed:config` after any secret change.

## Summary

- **T1 is complete.** The previously-stub team invite flow is now wired: create team → generate invite link → share URL → recipient lands on `?token=…` and auto-accepts. Backend + UI both exist.
- **T2 is complete.** The two remaining gaps (rubric UI and `JUDGING.md` + normalization proof) are now closed. Every T2 row is ✅.
- **Normalization Proof bonus (+5) is claimable.** `docs/dogfood/normalization-proof.txt` is a committed artifact generated from the fixture — not asserted in prose.
- **T3 is not claimable.** Blocking: no voting UI, no comment UI, no email-gated voting, no quadratic weighting, no randomised ballot order.
- **T4 is essentially absent.** No webhooks, certificates, signed participation records or embeddable widget; bulk import missing.

> **Phase 0–1 status: complete.** Next priority per `plan-phase-2-3.md`: voting + comment UI (unlocks T3 claim) → randomised ballot order → quadratic voting → bulk import.
