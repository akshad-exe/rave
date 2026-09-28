# Tier Tracker — Where We Stand

Status legend:
- ✅ **Done** — implemented and functioning
- 🟡 **Partial** — implemented with a documented gap, or backend-only with no UI
- ❌ **Missing**

> Backend = `packages/api` (oRPC procedures) + `packages/db` (schema) + `apps/server` (services/authz).
> UI = `apps/web` (TanStack Router SPA).
> Acceptance surface = plain-HTTP routes the Dogfood checker (`run.py`, at `docs/dogfood/run.py`) can hit with a Cookie header.
>
> **Last verified:** checker 7/7 PASS (`acceptance-report.txt`, `claimed T1 T2, verified T1 T2`) · 107 server tests across 11 files · lint, `check-types` 6/6, `build` 5/5 green.

---

## T1 — Core (the floor; required to be judged)

| Requirement | Status | Evidence / Gap |
|---|---|---|
| Authentication and sessions | ✅ | better-auth at `/api/auth/*` · `auth.test.ts` |
| Role model: visitor · participant · judge · organizer · admin | ✅ | `ROLE_HIERARCHY` + `userProfile.role`, `admin.setRole` |
| Event creation w/ configurable dates, tracks, prizes | ✅ | Backend (`events.create/update`, `tracks.*`, `prizes.*`) · organizer console `routes/(organizer)/organizer/events/` |
| Team formation by invite link | ✅ | Backend (`teams.createInvitation` 72h TTL, `acceptInvitation`) · submissions UI wired |
| Submission draft-and-edit until deadline | ✅ | Backend (`submissions.create/update/submit`, draft→submitted→locked) · `routes/submit/` |
| Deadline enforcement that holds | ✅ | `assertSubmissionOpen` (server clock, hard 4xx) — `submissions.test.ts` |
| Public gallery with search & filter | ✅ | Backend (`submissions.gallery`: search/techTag/trackId/sortBy) · `routes/gallery/index.tsx` · checker confirms fixture titles render |

## T2 — Judging

| Requirement | Status | Evidence / Gap |
|---|---|---|
| Judge invitation and assignment (batch/algorithmic) | ✅ | Backend (`assignments.assign/batchAssign`, skip reasons) · judge console `routes/(judge)/judge/assignments/` |
| Weighted, configurable rubric | 🟡 | Backend ✅ (`rubrics.create`, weight-sum=100 enforced, per-track, `isWeighted`) · **no rubric UI** |
| Backend-enforced role isolation | ✅ | Isolation in services (`getAssignedSubmission`/`scoring.getMyScore` 403 non-owner, `scoring.allScores` organizer-only) · plain `GET /judging/scores` + `?judge=` peer probe · checker `T2` 401-for-peer **PASS** |
| Organizer judge-progress dashboard | ✅ | Backend (`assignments.progress` with `byJudge` breakdown) · `routes/(organizer)/` |
| Cross-judge normalization, method documented | 🟡 | Backend ✅ (`results.compute` z-score per judge, `useNormalization`) · **`JUDGING.md` + normalization proof on fixture data still missing** |
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
| Normalization Proof (+5) | 🟡 normalization exists (`results.compute`); no proof-on-fixtures artifact |
| Pairwise Mode (Bradley–Terry) (+5) | ❌ |
| Threat Model (+3) | ❌ |
| API First + OpenAPI spec (+3) | 🟡 OpenAPI auto-generated; not every UI action; spec not published |

## Acceptance surface — the 7 `run.py` checks — ✅ 7/7

Receipt: `acceptance-report.txt` (`claimed T1 T2, verified T1 T2`). Checker at `docs/dogfood/run.py`, run as
`cd docs/dogfood && python3 run.py ../../.dogfood.toml > ../../acceptance-report.txt`.

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
| `ARCHITECTURE.md` · `DATA-MODEL.md` · `JUDGING.md` | ❌ | **Still missing** — required deliverables |

> **Reproducing the receipt:** the root `.env` (gitignored) must define `POSTGRES_PASSWORD` and
> `BETTER_AUTH_SECRET`, and `apps/server/.env` must share that same secret. If the host mints cookies with a
> different secret than the container verifies, every authenticated check 401s — and because a 401 is also a
> deny, the isolation checks will still report PASS. Refresh with `bun run seed:config` after any secret change.

## Summary

- **Acceptance: T1 + T2 verified, 7/7 on the checker**, with a committed receipt in `acceptance-report.txt`. 107 server tests across 11 files; lint, `check-types` (6/6) and `build` (5/5) green.
- **T1 is complete.** Backend and UI both exist; the gallery renders fixture content and the closed-event deadline holds under the server clock.
- **T2 is complete except the rubric UI and `JUDGING.md`.** Isolation is backend-enforced and now reachable over plain HTTP, which is what turned the two isolation checks from vacuous passes into real ones.
- **T3 is not claimable.** The blocking problem is not the backend — voting, comments, results-hiding and rate limits all exist. It is that `apps/web/src/routes` has no voting or comment route, so none of it is reachable by a user. Email-gated voting, quadratic weighting and randomised ballot order are also missing.
- **T4 is essentially absent.** No webhooks, certificates, signed participation records or embeddable widget; bulk import missing. The oRPC surface is not a documented REST API.
- **Still owed regardless of tier:** `ARCHITECTURE.md`, `DATA-MODEL.md`, `JUDGING.md` (the last also documents the normalization method, which T2 explicitly requires), plus a rubric UI and voting/comment UI.
- **Bonuses:** normalization is the closest to claimable (needs the proof artifact); everything else is greenfield.

> Priority when continuing: docs deliverables (`JUDGING.md` closes a T2 gap and a bonus at once) → rubric UI →
> voting + comment UI (turns T3 from backend-only into a real claim) → randomized ballot order and quadratic
> voting → bulk import/export. Per the spec, a clean T2 outscores a broken T4 — do not start T4 before T2 and
> T3 are clean.