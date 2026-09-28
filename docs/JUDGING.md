# Judging — Method, Defence, and Proof

This document explains how Rave normalises judge scores, why the method was chosen,
what failure mode it addresses, and where its limits lie.  A worked example using
real fixture output follows in §5.  The proof script that generated those numbers
lives in `docs/dogfood/normalization-proof.txt`.

---

## 1. The method: per-judge z-score

All normalisation logic lives in `apps/server/src/lib/normalization.ts` and is
called from `apps/server/src/features/results/helpers.ts` →
`apps/server/src/features/results/service.ts`.

For each judge independently:

1. Collect all `totalScore` values that judge submitted across their assigned
   submissions.
2. Compute the judge's mean `μ` and **sample standard deviation** `σ` (divides
   by `n − 1`):

   ```
   μ  = Σ(xᵢ) / n
   σ  = √[ Σ(xᵢ − μ)² / (n − 1) ]
   ```

3. For each of that judge's scores, compute the z-score:

   ```
   z = (x − μ) / σ
   ```

4. Map the z-score onto the display range **[0, 100]**, anchoring the judge's
   mean at 50 and letting ±3 standard deviations span the full range:

   ```
   normalised = clamp(0, 100,  50 + z × (100 / 6))
   ```

   The constant `100 / 6 ≈ 16.67` comes from requiring that a project exactly
   3 σ above the judge's mean maps to 100, and one exactly 3 σ below maps to 0.

5. Aggregate per submission: take the average of the normalised scores from all
   judges assigned to that submission.

6. Use `finalScore = normalised ?? rawMean` — if normalisation is disabled or
   produces no usable scores, the system falls back to the raw mean.

### Edge-case handling (from the implementation)

| Situation | Behaviour |
|---|---|
| Judge has < 2 scores | Cannot compute meaningful σ; score is mapped to 50 (midpoint). |
| σ < 0.0001 (all scores identical) | Same as above — mapped to 50. |
| `useNormalization = false` | `buildNormalizedScoreMap` returns `null`; raw mean is used. |

---

## 2. Why z-score instead of raw mean

Judges are human.  Even when they are given a rubric with explicit scale
definitions, two systematic biases appear in practice:

**Generosity bias** — one judge consistently scores at the top of the scale
(e.g. 8–10/10), another at the middle (5–7/10).  A project reviewed only by
the generous judge will have a higher raw mean than an equivalent project
reviewed only by the strict judge, purely due to panel composition.

**Scale-usage bias** — one judge uses the full 0–10 range; another compresses
all scores into 7–9.  The compressed scorer's scores carry almost no
discriminative information when combined with the full-range scorer's scores in
a raw average.

Z-score normalisation addresses both problems simultaneously.  It removes the
judge's *absolute level* (the mean term) and their *scale usage* (the σ term).
After normalisation, each judge's distribution has mean 50 and a comparable
spread regardless of how they used the raw scale.

---

## 3. The failure mode it fixes

Concrete scenario: suppose three judges score project P.

| Judge | P score | Judge's mean across all their projects |
|---|---|---|
| A (generous) | 9 | 8.8 |
| B (neutral)  | 6 | 5.1 |
| C (harsh)    | 4 | 4.3 |

**Raw mean for P:** (9 + 6 + 4) / 3 = **6.33**

But judge A is generous to everyone — that 9 doesn't reflect P being special
relative to A's pool.  Judge C is harsh to everyone — that 4 doesn't reflect P
being worse than average relative to C's pool.

After z-score normalisation each judge's score for P is expressed in units of
"how far above or below that judge's own mean was this project?", then
re-centred at 50:

- Judge A: P was roughly at their mean → normalised ≈ 50
- Judge B: P was slightly above their mean → normalised ≈ 53
- Judge C: P was slightly below their mean → normalised ≈ 47

Normalised mean for P ≈ 50.  This is a much more stable estimate than the raw
6.33 which was pulled up by judge A's generosity.

---

## 4. Limitations

**Small-n noise.** The fixture assigns 3 reviews per project on average.  With
n = 3 per submission, the estimate of a judge's true bias is based on a handful
of scores.  A judge who happens to review a cluster of unusually strong (or
weak) submissions will have an estimated mean that is skewed, causing the
normalisation to over-correct.  This is inherent to any bias-correction method
with small samples.

**Independence assumption.** The method assumes judges form their scores
independently.  If judges discuss scores before submitting, or if they are
shown one another's scores, the normalisation is no longer meaningful.  The
system enforces isolation at the data layer (a judge cannot read peer scores
via the API), but it cannot prevent informal coordination outside the platform.

**Single normalised scale.** All criteria are collapsed into a single
`totalScore` before normalisation.  Per-criterion bias (a judge who is
systematically harsh on "innovation" but not on "functionality") is not
addressed.

---

## 5. Worked example from the fixture

The fixture event (`evt_01`) has 30 judges, 40 storable projects (prj_41 is
intentionally unstorable — duplicate team submission), and 122 storable
criterion-level score records.  Each score record carries three criteria
(`functionality`, `quality`, `innovation`), and the backend stores their
weighted sum as `totalScore`.

The full before/after comparison is in `docs/dogfood/normalization-proof.txt`,
generated by `docs/dogfood/normalization_proof.py`.

### Per-judge distribution stats (excerpt from proof output)

| Judge | n | Mean (raw) | Std dev | Min | Max | Notes |
|---|---|---|---|---|---|---|
| jdg_02 | 6 | 12.67 | 2.42 | 9.0 | 15.0 | |
| jdg_07 | 3 | 12.00 | 0.00 | 12.0 | 12.0 | ⚠ stddev ≈ 0 → 50 |
| jdg_24 | 11 | 10.09 | 1.87 | 8.0 | 13.0 | Most scores |
| jdg_26 | 9 | 11.11 | 1.54 | 9.0 | 14.0 | Compressed range |
| jdg_01 | 1 | 6.00 | 0.00 | 6.0 | 6.0 | ⚠ n < 2 → 50 |
| jdg_23 | 1 | 10.00 | 0.00 | 10.0 | 10.0 | ⚠ n < 2 → 50 |

Three judges trigger the degenerate path (jdg_01, jdg_07, jdg_23) — their
scores are mapped to 50 because there is not enough variance to normalize.

### Before/after spread for selected projects

| Project | Title | Judges | Raw mean | Norm mean | Δ |
|---|---|---|---|---|---|
| prj_34 | Iron Switch | 3 | 13.00 | 68.95 | +55.95 |
| prj_11 | Salt Ledger | 4 | 13.00 | 62.99 | +49.99 |
| prj_07 | Dry Harbour | 5 | 10.00 | 56.70 | +46.70 |
| prj_35 | Warm Beacon | 5 | 10.40 | 48.64 | +38.24 |
| prj_05 | North Compass | 3 | 8.67 | 29.00 | +20.33 |
| prj_40 | Slow Loom | 2 | 9.00 | 34.65 | +25.65 |

All deltas are positive because the raw scores (0–15 scale: 3 criteria × 0–5)
are mapped onto the normalised [0, 100] display scale.  What matters is the
*relative* change: projects reviewed by harsh judges gain more than projects
reviewed by generous judges, narrowing the judge-composition bias.

### Ordering stability (from proof assertions)

| Metric | Value |
|---|---|
| Projects ranked | 40 |
| Spearman ρ (raw vs normalised) | **0.8559** |
| Pair inversions | 118 / 780 (15.1%) |
| ρ ≥ 0.85 assertion | **PASS ✓** |
| Inversion rate ≤ 20% assertion | **PASS ✓** |

The rank order is materially preserved.  The absolute spread widens from a raw
range of 4.33 (8.67–13.00) to a normalised range of 39.95 (29.00–68.95),
which better discriminates between projects that had similar raw means.

See `docs/dogfood/normalization-proof.txt` for the complete per-project table
and assertion output.

---

## 6. Implementation references

| File | Role |
|---|---|
| `apps/server/src/lib/normalization.ts` | `zScoreNormalize()` — the core algorithm |
| `apps/server/src/features/results/helpers.ts` | `buildNormalizedScoreMap()`, `aggregateSubmissionResults()` |
| `apps/server/src/features/results/service.ts` | `results.compute` — orchestrates the pipeline |
| `packages/api/src/routers/results.ts` | `POST /events/{eventId}/results/compute` — the API endpoint |
| `packages/api/src/schemas/results.ts` | `computeResultsInput.useNormalization` flag |
