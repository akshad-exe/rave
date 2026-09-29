# Threat Model — Rave

**Scope.** The abuse a hackathon organizer, a competing team, or a bored participant would attempt against
community voting and project submission. The five threats below are the ones the DOGFOOD 2026 brief names:
Sybil voting, ballot stuffing, submission scraping, judge collusion, and deadline gaming.

**What counts as a control here.** A line of code, a database constraint, or a documented decision. Anything
asserted without one is listed as a residual risk rather than a defence. Claims are marked
**verified** where an automated check exercises them.

---

## 0. Assets and adversaries

| Asset | Why it matters |
|---|---|
| Judging integrity | Scores decide prizes. A biased or bought score is the worst outcome in the system. |
| Role isolation | A judge reading a peer's scores is a credibility failure, not a bug. |
| Submission provenance | Knowing what was submitted, when, and by whom. |
| Vote signal | Community voting is conceded to be gameable; the goal is to make gaming expensive, not impossible. |

| Adversary | Capability |
|---|---|
| **Anonymous participant** | Holds the ballot URL. No account. |
| **Authenticated participant** | Can register, form a team, submit, vote. |
| **Sybil operator** | Can create many accounts. May control several identities. |
| **Judge** | Legitimate account with the `judge` role. The most dangerous insider. |
| **Organizer** | Trusted for their own event. Not trusted for *other* events. |
| **Scraper** | Unauthenticated, high request volume, no browser. |

---

## 1. Sybil voting

**Attack.** Create N accounts, cast N votes on one project. One-person-one-vote makes influence linear in
accounts bought.

**Controls.**

- **Quadratic influence.** A vote contributes `√n` of its weight, so *n* votes on one project buy √n influence.
  This is the whole point: the marginal return of a sybil collapses. Implemented at
  `apps/server/src/features/voting/votes.ts` (`Math.sqrt(votes)`) and documented, including its costs, in
  `docs/QUADRATIC_VOTING.md`. **verified** — `quadratic influence computed` in `acceptance-report-extended.txt`.
- **A cap per account.** `maxVotesPerUser` is enforced server-side on every vote, not just in the UI.
- **A cap per account *and* project.** `unique("vote_voter_submission_unique").on(t.voterId, t.submissionId)`
  in `packages/db/src/schema/community.ts`. A duplicate is rejected by the database, so a racing client
  cannot slip past a read-then-write check.
- **Email-gated mode.** Where an organizer enables it, a vote requires a one-time, expiring code issued to the
  voter's address (`votingVerification`), compared with `timingSafeEqual` and cleared on use so a captured code
  cannot be replayed.
- **Global rate limit.** 200 requests/minute per IP, applied to every route (`plugins/rate-limit.ts`,
  `global: true`). **Residual risk:** IP-keyed, so a botnet behind distinct addresses is unaffected. It raises
  the cost of bulk work, it does not stop a determined operator.

**Residual risk.** Quadratic voting suppresses enthusiasm along with manipulation, and a determined operator
still converts N accounts into √N influence. It is a cost curve, not a barrier. The one structural defence we do
not have is identity verification; see §6.

---

## 2. Ballot stuffing

**Attack.** Cast the maximum number of votes in a burst, or repeat votes to flip a count after observing the
tally.

**Controls.**

- **Votes are idempotent per account.** The uniqueness constraint above means re-voting the same project is a
  conflict, not an increment. There is no code path that adds weight twice.
- **Unvoting is explicit and audited.** `vote.unvote` deletes the row rather than decrementing a counter, so
  there is no counter to drift. Both `vote.cast` and the vote-verification event are written to the audit log.
- **The tally is derived, not stored.** Counts are computed from the `vote` rows on read
  (`features/voting/votes.ts`), so there is no denormalised total to tamper with by racing writes.
- **Results are hidden while the window is open.** `votingResultsVisible` gates `voting.counts`, which returns
  403 to anyone but the organizer, so a stuffer cannot tune to the running total. **verified** — the extended
  checker asserts 403 as a voter and 200 as the organizer.

**Residual risk.** Because ordering is per-voter seeded and results are hidden, a stuffer cannot see whether
they are ahead. They can still stuff blindly within `maxVotesPerUser`.

---

## 3. Submission scraping

**Attack.** Harvest every project — name, description, repository URL, live demo URL — to clone the work, or to
reconnaissance an event before it opens.

**Controls.**

- **Public means public, by design, and only for submitted work.** The gallery requires
  `event.isPublic || session` (`features/submissions/service.ts:221`) *and* filters to
  `status = "submitted"`. A draft is not scrapeable, and a private event is not scrapeable without a session.
- **Drafts and unpublished work are excluded twice** — by event visibility and by submission status — so a
  misconfigured flag on one does not expose the other.
- **The rate limit applies to reads as well as writes.** The 200/min budget is global, so bulk scraping is
  bounded per IP.
- **The submission deadline closes the write side.** See §5.

**Residual risk — stated plainly.** For a public event, the gallery is *intended* to be scrapeable; that is the
product. There is no per-request authorisation, no crawl budget, and no anomaly detection. If a project did not
want its repository scraped it must not submit the URL. The live-demo URL is the sharpest edge: it can expose a
running deployment that is not otherwise public.

---

## 4. Judge collusion

**Attack.** Judges coordinate scores, or read each other's work before scoring, so the field is distorted.

**Controls — all backend-enforced, none in the UI.**

- **A judge cannot read a peer's assignment.** `getAssignmentForJudge` compares `assignment.judgeId` to the
  session user and throws `forbidden("Not your assignment")`
  (`features/judging/helpers.ts:54`).
- **A judge reads only their own scores.** `scoring.getMyScore` derives the judge id from the session
  (`requireUserId`), never from client input, so there is no id to tamper with.
- **Aggregate scores are organizer-only.** `scoring.allScores` is not reachable by a judge.
- **The plain-HTTP surface enforces the same rules.** `/judging/scores?judge=<id>` is a real route the
  acceptance checker visits *as a different judge* and expects a refusal.
  **verified** — `judge cannot see peer scores` in `acceptance-report.txt`, and the isolation matrix in
  `src/tests/rbac.test.ts` (9 assertions) plus `security.test.ts` and `judging.test.ts`.
- **Assignment is disjoint.** `batchAssign` produces one assignment per judge per submission with recorded skip
  reasons, so a judge cannot be assigned a ballot twice to double their weight.
- **Scores can be locked.** `scores.lock` freezes a score, and `score.submit` is audited.
- **Every privileged mutation is audited.** `judge.assign`, `score.submit`, `scores.lock`, `rubric.create`,
  `event.transition`, `admin.set_role`, `vote.cast`, `vote.verify` and more are written with actor and metadata
  an organizer can read without a database client.

**Residual risk.** Collusion between two judges who never exchange data is invisible: a quiet agreement to
inflate a project leaves no trace in an audit log that records actions, not intent. Cross-judge normalization
(`JUDGING.md`) and the proof artifact dampen the *effect* of a biased judge on the ranking, but they cannot
detect a coordinated pair. **This is the most significant unmitigated threat in the system.**

---

## 5. Deadline gaming

**Attack.** Submit or edit after the deadline, or hold the event in a permissive phase to keep the window open.

**Controls.**

- **The server owns the clock.** `assertSubmissionOpen` reads `submissionDeadline` and `submissionStartAt` from
  the database and throws on the server (`features/submissions/helpers.ts`). A client with a wrong clock, or a
  crafted request, gains nothing.
- **It gates both create and submit.** The check runs on `submissions.create` and again on `submissions.submit`,
  so a draft cannot be finished late either.
- **Phase transitions are a validated graph.** `VALID_STATUS_TRANSITIONS` only permits
  `submission → judging → results → archived` (and back one step). An organizer cannot jump an event straight to
  a state that reopens the window, and every transition is audited.
- **The seeded event proves the check bites.** The fixture event's own `submissions_close` is in the past, so a
  late submission is refused by the deadline check itself rather than by a phase guard —
  **verified** by `closed event refuses submissions` in `acceptance-report.txt`.

**Residual risk.** An organizer can move `submissionDeadline` later, because they are authorised to edit their
own event. That is a legitimate power, not a bug, but it means the deadline is only as honest as the organizer.
`event.update` is audited, so a post-hoc extension leaves a record.

---

## 6. Cross-cutting

- **Secrets.** One secret, in one file. Compose passes `apps/server/.env` to the server via `env_file` and
  deliberately does *not* also set `BETTER_AUTH_SECRET` under `environment:`, because in Compose `environment`
  wins and doing both once split the signing key between host and container. See the README.
- **Import and export are organizer-only.** `assertEventOrganizer` guards every export and both bulk imports; a
  participant is refused, and a test pins it.
- **Partial updates cannot reset an event.** `updateEventInput` is built from default-free field shapes, because
  inheriting `.default()` would let an omitted key silently overwrite a stored value — which once turned a public
  event private.
- **CSV import is bounded.** Bad rows are reported with their spreadsheet line rather than failing the file, and
  a score row with no judge assignment is refused instead of being dropped.

## 7. What we would do next, in order

1. **Detect colluding judges.** Correlate score residuals per judge per project; a pair with suspiciously
   aligned deviations is a signal a coordinator should see. Nothing today surfaces this.
2. **Verify identity for `gated` mode.** The code exists and is required, but there is no mailer, so delivery is
   simulated outside production. Real delivery is the single biggest gap in the sybil defence.
3. **Make link-based voting real.** `open` mode currently still requires an account, so it is
   indistinguishable from `authenticated`. Genuine anonymous voting needs a per-visitor identity (a signed
   cookie) before `maxVotesPerUser` can still be enforced.
4. **Per-route rate limits.** A single global budget means a scraper and a judge share one allowance.
5. **Audit-log alerting.** Actions are recorded and readable, but nothing raises a flag.
