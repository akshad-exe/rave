---
name: rave-hackathon
description: The DOGFOOD 2026 submission contract — tiers, the seven acceptance checks, the shared fixture and its two intentionally unstorable rows, and what the graders read. Use when running the acceptance suite, changing seed data, or deciding whether a change helps or hurts the submission.
user-invocable: true
---

# DOGFOOD 2026

The brief is "build the platform that will judge you". The 1st-place repo is
forked into production, so the thing being judged is software somebody intends
to operate, not a demo.

Full brief: `docs/dogfood/hackathon.md`. Spec: `docs/dogfood/specs/spec.md`.

## Scoring

| Criterion | Weight |
|---|---|
| Tier Completion & Correctness | 40% |
| Judging Integrity | 25% |
| Adoptability & Operability | 20% |
| Code Quality & Innovation | 15% |

Four optional bonuses (+16 max) do **not** change the score — they break ties:
Normalization Proof, Pairwise Mode, Threat Model, API First.

## Tiers

- **T1 core** — auth/sessions, roles, events, teams, submissions with draft and
  edit, deadline enforcement, public gallery. The floor.
- **T2 judging** — judge assignment, weighted rubrics, backend-enforced role
  isolation, progress views, normalization, CSV export.
- **T3 public** — community voting, comments, results hidden until the window
  closes, randomised ballot order, anti-abuse.
- **T4 stretch** — REST API + webhooks, certificates, verifiable judge records,
  embeddable gallery, bulk import/export.

A clean T2 beats a broken T4. **Tier claims are verified by the checker, not the
README.** Rave currently claims T1 + T2.

## The acceptance suite

`docs/dogfood/specs/run.py` is the same Python program every team runs, so nobody
is judged more strictly than anyone else. It never logs in — you hand it
headers.

```bash
bun run seed:config                       # regenerate .dogfood.toml from the server
python3 docs/dogfood/specs/run.py .dogfood.toml
python3 docs/dogfood/specs/run.py .dogfood.toml > acceptance-report.txt
```

`acceptance-report.txt` is a required submission and must be committed **even if
it has failures**. Two honest FAIL lines read better than a README claiming
everything works.

`.dogfood.toml` is generated, not hand-written — the `auth` cookies are minted by
the seed on every boot and the `routes` come from `PORTAL_ROUTES`. Re-run
`seed:config` after a server restart or the cookies are stale.

Set `DOGFOOD_BASE_URL` if the portal is not on `http://localhost:3000`, and give
the server the same `PORT`.

The seven checks, and what each actually proves:

| Check | Proves |
|---|---|
| gallery is public | `/gallery` returns 200 unauthenticated |
| project from fixtures shown | a known fixture project title is in the body |
| closed event refuses submissions | POST as participant gets 4xx (fixture's `submissions_close` is in the past) |
| judge sees own scores | `/judging/scores` as judge_a → 200 |
| **judge cannot see peer scores** | `?judge=<other>` as judge_b → 401/403 |
| participant blocked | `/judging/scores` as participant → 401/403 |
| csv export works | `/exports/scores.csv` as organizer → 200 + CSV |

The peer-scores check is the one the spec calls out as mattering most. Hiding
the button is not refusing the request; the check has to live where `curl`
arrives.

## Fixtures

`docs/dogfood/fixtures.json` is shared by every team, so all portals hold the same
40 projects and only the software differs. A root `fixtures.json` symlink points
at it so the checker finds it without a `--fixtures` flag. Biome excludes both
(the symlink cannot be followed).

The seed loads it idempotently on every boot: inserts ignore conflicts, so a
fresh volume gets the fixture and an existing one is left alone.

**Two fixture rows are meant to be unstorable, and the seed reports them on
startup** — that is correct behaviour, not a bug:

- `prj_41` — its team already submitted `prj_07`, and a team may submit once per
  event.
- 4 scores for `prj_41` — a score hangs off a submission, so these have nothing
  to attach to.

The fixture also contains the awkward cases on purpose: a judge who scored every
project identically (exercises the zero-stddev path in normalization), unfinished
review batches, and a duplicate submission. Do not "fix" these by loosening the
schema.

## Demo logins

The seed signs in as one organizer, two judges and one participant and prints a
`Cookie:` header per role. Those are what `.dogfood.toml` carries.

## What is not judged

Your language, framework, database, ORM, schema, route names, CSS, repo layout,
commit style, branch names, whether you wrote tests, which AI tools you used, how
you split work, or whether you slept. Tier completion is verified by the checker;
honest gap reporting is rewarded.
