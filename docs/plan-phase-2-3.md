# Plan — Phase 2 & 3: claim T3, then attempt T4

**Goal:** turn T3 from "backend exists, user cannot reach it" into a genuine claim. Then decide, honestly,
whether T4 is worth attempting.

**Precondition:** Phase 0–1 complete (`plan-phase-0-1.md`), T1/T2 verified 7/7.

---

## The evidence problem — read this first

The published checker (`docs/dogfood/run.py`) declares `TIERS = ["T1","T2","T3","T4"]` but ships **only the
seven T1/T2 checks**. No T3 or T4 check exists.

So T3 and T4 would be claimed with **no machine receipt** — the opposite of T2, which has a committed one. The
spec weights tier depth 40% but says it is *"verified by the acceptance suite rather than by your README."*

Decide up front how to handle it:

1. **Write your own extended verifier** (recommended for voting/comments) — e.g.
   `docs/dogfood/verify-extended.py`, asserting the same way the official checks do, over HTTP, with a Cookie
   header. Do **not** edit the published `run.py`; the organizers own it.
2. **Document gaps honestly** and let judges verify by hand — appropriate for certificates and signed records.

Never mark a T3/T4 row ✅ on the strength of backend code alone. T3's whole failure mode right now is exactly
that: complete services, no route, nothing a user can reach.

---

## Phase 2 — T3 (5 gaps)

Backend is largely built. This phase is mostly exposure plus three real features.

### 2.1 Voting UI — the blocker

`apps/web/src/routes` has **no voting route**, so a participant cannot cast a vote through the app. Backend
procedures exist: `vote`, `unvote`, `myVotes`, `counts`, `create`, `list`, `delete`.

- New public route, e.g. `routes/(public)/vote/`
- Ballot rendering, vote/unvote against `voting.counts` + `myVotes`
- Respect the result-visibility gates already in place (see 2.4)
- Gallery entries get a vote affordance linking into the ballot

Size: S. Value: this one row is the difference between "has a voting service" and "has community voting".

### 2.2 Comment UI

Backend: `create` / `list` / `delete` (soft). No UI.

- Comment thread on gallery project cards
- Post and soft-delete, respecting the existing authz
- Keep soft-delete visible to moderators only, per current backend behaviour

Size: S.

### 2.3 Email-gated voting

`votingMode` is already a field; `features/voting/helpers.ts:34` gates `authenticated`. Add `"gated"`.

- New enum member on the event's `votingMode`
- Email verification step before a vote counts
- Token issuance + expiry, reusing the existing session/auth machinery rather than inventing one

Size: M.

### 2.4 Randomised ballot ordering

Nothing shuffles ballot order today, so position bias is live. The subtlety: it must be **stable per voter
across refreshes** (or a voter can double-vote by reshuffling) but **different between voters** (or the bias
is merely hidden from the voter while still shaping results).

- Shuffle in the query, seeded by a per-voter value
- Persist the seed so refresh and back-navigation are consistent
- Keep judge's *assigned submissions* un-shuffled — that is a workload, not a ballot

Size: S.

### 2.5 Quadratic voting

The spec's credible anti-Sybil suggestion: *n* votes on one project costs √n in influence. Currently 1:1.

- Store raw vote count, compute influence as √n at read time — do not store a derived column
- Update aggregation in `features/voting` and the results path
- Document the threat it addresses (a loud minority) **and** its costs: it suppresses genuine enthusiasm, and
  it is harder to explain to voters than one-person-one-vote
- Defend the choice either way — the spec allows a better scheme if you can argue for it

Size: M.

**Phase 2 exit:** a participant can vote and comment through the UI; email-gated voting works; ballots are
randomised per voter; influence is quadratic. T3 is claimable with evidence.

---

## Phase 3 — T4 (6 gaps, and the honest cost)

⚠️ The spec is explicit: *"A clean, correct T2 scores above a broken T4 every time."* Phase 3 is the largest and
lowest-yield work in the ladder. Do not begin it before Phase 2 is clean and committed.

### 3.1 Bulk import

Export exists (`assignments`, `rawScores`, `results`, `submissions`, `teams`); import does not.

- Inverse of the five exports, CSV in
- Validate rows, report per-row errors rather than failing whole-file
- Reuse the fixtures loader for shape validation

Size: M.

### 3.2 Certificate and record generation

- Generate a judge participation certificate (PDF or print-optimised HTML)
- Signed artifact, not just a name on a template

Size: M.

### 3.3 Signed, publicly verifiable participation records

- Sign each judge's participation record with an asymmetric key (Ed25519 fits — no infra, fast, strong)
- Publish the public key
- Expose a public verify endpoint: given a record, return who it is and whether the signature holds
- This is the "publicly verifiable" half — a signature nobody can check is decoration

Size: L.

### 3.4 Webhooks over every UI action

- Emit on domain events (submission created/submitted, score locked, judging closed)
- Outbound POST, HMAC-signed payloads, timestamped to prevent replay
- Retry with backoff + a delivery log an organizer can read in the UI
- Respect the existing `auditLog` as the source of truth for what happened

Size: L.

### 3.5 Embeddable gallery widget

- A standalone script + iframe surface over the public gallery
- Self-contained, no build step for consumers, respects the event's visibility rules
- Must not become an isolation hole: a public embed must not expose unpublished or judging-gated data

Size: M.

### 3.6 Real REST verbs

Everything is `POST /rpc/*` today. oRPC already generates OpenAPI (`apps/server/src/plugins/orpc.ts:73` serves
`/api-reference/*`), so much of this is configuration — but the spec asks for a published, consumable spec
covering every UI action, not an auto-generated dump.

- Configure the OpenAPI generator to emit proper verbs and a published spec
- Cover the actions a UI can take, not merely the ones already exposed
- Decide and document auth: the API is session-cookie based today; a real REST surface needs a documented story

Size: M, mostly mechanical — but easy to overstate. "Auto-generated spec exists" is not "REST API shipped".

---

## Verification gate

Identical to Phase 0–1, run after every item. The non-negotiable is that **T1/T2 stays 7/7**:

```bash
cd ~/Codebase/Hackathon/Dogfood/rave
bun run check && bunx turbo run check-types && bunx turbo run build
bunx turbo run test --filter=server --force          # >= 107, no regressions
cd docs/dogfood && python3 run.py ../../.dogfood.toml > ../../acceptance-report.txt
cd ../.. && tail -3 acceptance-report.txt          # must stay: verified T1 T2
```

Phase 2 adds your own extended verifier (see the evidence problem above) and runs it alongside the official
checker. Both must pass.

---

## Definition of done

Phase 2:

- [ ] Voting route exists and a participant can vote through it
- [ ] Comment UI on gallery projects
- [ ] `votingMode` supports email-gated, with verification
- [ ] Ballot order randomised per voter, stable across refresh
- [ ] Influence is √n, with the trade-off documented
- [ ] Extended verifier passes; official checker still 7/7
- [ ] `docs/tiers.md` T3 rows updated with real evidence

Phase 3 (only if Phase 2 is clean):

- [ ] Bulk import with per-row error reporting
- [ ] Judge participation certificates
- [ ] Signed records + public verify endpoint + published key
- [ ] Webhooks with signing, retry, and an organizer-readable delivery log
- [ ] Embeddable gallery widget that leaks nothing gated
- [ ] Published REST spec with real verbs and a documented auth story

---

## If time runs short

Stop after Phase 2. **T1 + T2 complete with a committed receipt, plus a genuinely working T3**, is a far stronger
submission than T1 + T2 + three half-built T4 items. Partial T4 is the specific outcome the spec penalises, and
inflated claims score worse than honest gaps.
