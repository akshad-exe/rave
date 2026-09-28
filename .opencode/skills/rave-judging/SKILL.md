---
name: rave-judging
description: The judging layer and the invariants that must never regress — judge isolation, weighted scoring, cross-judge normalization, score locking, and the audit trail. This is 25 percent of the DOGFOOD score and the part most easily broken by a well-meaning refactor. Use when touching apps/server/src/features/judging, results, or any code that reads or writes scores.
user-invocable: true
---

# Rave judging layer

Judging Integrity is **25%** of the DOGFOOD score (Tier Completion is 40%), and
judge isolation is the single most heavily weighted behaviour. Correctness here
beats breadth everywhere else.

## The isolation invariant

**A judge may never read another judge's scores, by any path.**

It is enforced in three independent places, and all three must hold:

1. `features/judging/helpers.ts` → `getAssignment(ctx, assignmentId, judgeId)`
   throws `forbidden("Not your assignment")` when the assignment's `judgeId` does
   not match the caller. `scoring.getMyScore` and `scoring.submit` both go
   through it.
2. `features/judging/assignments.ts` → `myAssignments` filters on **both**
   `eventId` and the caller's own `judgeId`.
3. `features/portal/route.ts` → `getJudgeScores` reads `?judge=<id>`, compares it
   against `requireExactRole(ctx, "judge")`, and throws `forbidden` on mismatch.

Two deliberate choices there:

- **403, not 404**, on a peer-scores request. The caller *is* a judge and is not
  the judge being asked about; confirming the route exists helps nobody, and the
  response must not carry anything from the other judge's work.
- **`requireExactRole`, not the role hierarchy.** `requireRole("judge")` in
  `packages/api` treats `organizer` as outranking `judge`. For a judge's
  own-scores view that would silently hand organizers access, so the portal path
  uses the exact-match helper in `apps/server/src/lib/assert.ts`.

`apps/server/src/tests/security.test.ts` and `features/judging/judging.test.ts`
("JUDGE ISOLATION — Critical Security") cover this. If you change any of the
three call sites, those tests are the contract.

## Scoring

`features/judging/scoring.ts`:

- Rubric criteria are validated with `assertCriteriaScoresValid` — every criterion
  in the rubric must be present exactly once, and each score must fall within
  that criterion's `minScore`/`maxScore`. Unknown criterion ids are rejected, so
  the client's form must send **real** `rubric_criterion.id` values.
- The total is `computeTotalScore(..., isWeighted)`. With `isWeighted`, each
  criterion is scaled by `weight / 100`; without it, raw scores are summed.
- A submit is transactional: upsert the score **and** set the assignment to
  `completed` in one `db.transaction`.
- `scores.lock` sets `isLocked` for every score in an event. A locked score
  cannot be resubmitted — `scoring.submit` checks it and throws. Locked state
  lives per-row, so respect it on any new write path.

## Normalization

`apps/server/src/lib/normalization.ts` → `zScoreNormalize`:

- Computes mean and **sample** stddev (n−1) **per judge**, then
  `z = (x - mean) / stddev`, mapped to `[0, 100]` as `50 + z × (100 / 6)` and
  clamped. A judge's mean always lands at 50.
- Degades to exactly **50** when stddev ≈ 0 (a judge who gave everything the same
  score — the fixture contains one on purpose) or when the judge has **fewer than
  2** scores (cannot normalise).
- `results.compute` averages the per-judge normalised scores per submission for
  `finalScore`, and keeps `rawScore` alongside it. Both are stored, so the effect
  of normalisation is auditable rather than asserted.

If you change the mapping constant or the stddev convention, say so in
`JUDGING.md` — the DOGFOOD bonus for a "normalization proof" is judged on
whether the method is defensible, not merely present.

## Results and audit

`features/results/service.ts` → `compute` ranks by `finalScore` descending,
assigns both an overall `rank` and a per-track `trackRank`, and upserts one `result`
row per submission. `getPublished` refuses to return anything until
`event.judgingResultsVisible` is set, unless the caller organises the event.

Every mutating service writes through `writeAudit` (`packages/api/audit.ts`) with
`action`, `resourceType`, `resourceId` and the `eventId`. Preserve that: the
audit trail is named in the Judging Integrity criterion.

## Before you change anything here

- [ ] Does a judge still get 403 for a peer's scores on **all three** paths?
- [ ] Are the service-level tests still green (`bun run test` in `apps/server`)?
- [ ] Did you keep `rawScore` and `normalizedScore` both stored?
- [ ] Is the new write path audit-logged?
- [ ] Can an organizer reach a judge-only view through a hierarchy check?
