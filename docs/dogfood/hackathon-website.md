# Dogfood — Build the platform that will judge you

> **UNIT / DF-01 · 51.5310°N 0.0500°E · REV 2.6 · SYS READY · REGISTRATION OPEN**
> September 25–28, 2026 · Online · Free · $2,500 in prizes

**Source:** [dogfoodhack.com](https://dogfoodhack.com) — full website brief (kicker/brief, tiers, timeline, scoring, prizes, rules, judges, FAQ, references).

---

## BRIEF / 00

Thirty-five hackathons in, across 85 countries, we know exactly what a submission and judging platform should do. So does every organizer who has ever run one. What none of us has is a modern, open, self-hostable platform that does it. This is the hackathon where you build it. The winning project is the one we run.

### 01 / By the numbers

| Unit | Stat |
|---|---|
| N-01 | **35** hackathons Hackathon Raptors has run since 2023, across 85+ countries. The spec for this event comes out of that. |
| N-02 | **0** major hackathon platforms publish an official public API. The whole ecosystem runs on scrapers and CSV export. |
| N-03 | **5 hours** for one judge to score 30 projects, by the largest platform's own estimate. |
| N-04 | **72h** to build the thing that replaces all of it. |

### 02 / The problem

> Running a hackathon is a data problem wearing a party hat.

**Fig. 01 — Event pipeline / 10 stages:** Registration · Teams · Submissions · Eligibility · Assignment · Scoring · Normalization · Results · Certificates · Archive. Ten stages, each with its own state, each feeding the next. Get one wrong and the part that suffers is the judging, which is the part participants actually came for.

Hackathon Raptors has run thirty-five events on this pipeline since 2023, across 85 countries and roughly a dozen a year. That is where the specification for this hackathon comes from.

**Why the incumbents aren't the answer.** Devpost, Devfolio, TAIKAI, DoraHacks, HackerEarth and Unstop all ship the same nine things: an event microsite, registration, team formation, project submission, a public gallery, judge scoring, community voting, an organizer dashboard, and a CSV export. That list is not exotic — it is a weekend of work for a team that knows what it is doing.

Then they stopped:

- The largest platform in the category **cannot weight its judging criteria differently**; its own documentation tells organizers who need weighted criteria to judge offline in a spreadsheet.
- Devfolio advertises "automatic score normalization" as a headline feature and, like everyone else, publishes nothing about how it works.
- Community voting is universally conceded to be gameable: the standard advice is to keep the prize small and hide results until you have manually reviewed the votes.
- Not one of them has an official public API, so the integration layer of an entire industry is unofficial scrapers and downloaded spreadsheets.

**The open-source tier proves the appetite is real.** Gavel came out of HackMIT with a genuine idea inside it: stop asking judges for absolute scores and ask them which of two projects is better, then recover a global ranking with a Bradley-Terry estimator. JunctionApp, Dribdat, Quill and Hibiscus all exist and are all self-hostable. What nobody has assembled is a modern, self-hostable, API-first whole that a working organizer can run on Monday.

> Dogfood is a 72-hour hackathon with one product in it. Everyone builds the same thing against the same spec: a submission and judging portal. We publish the spec, a real anonymised dataset, and an acceptance suite you run against your own build. You ship it open source. We take the winner, self-host it, and run our events on it.
>
> **Build the platform that will judge you.**

### 03 / Dossier — what happens to the winner

File DF-2026-W · REV 2.6 · The part every other hackathon leaves vague, stated plainly.

1. **You keep your work.** Ship under MIT or Apache-2.0. The repo is yours. We do not ask for an assignment, a transfer, a CLA, or an exclusivity clause. There is nothing to sign.
2. **We fork it and run it.** The winning project gets forked, self-hosted, and put into production for Hackathon Raptors events. That is the prize behind the prize.
3. **You get credited where it counts.** Not a thank-you tweet. A credit line on every event page the platform powers, for as long as it powers them.
4. **We upstream back.** Every fix, hardening pass and feature we add on top gets sent back to your repository as a pull request.
5. **This is not a maybe.** We run roughly a dozen events a year and intend to run the next decade of them on whatever wins.

> One honest caveat: if the top entries are close, we may adopt one and borrow ideas from another, with credit to both. We will say so publicly and in detail. What we will not do is quietly take your architecture and call it ours.

### 04 / The tier ladder

No tracks. One product, four tiers. Every team builds against the same published spec, and your score is how far up the ladder you climbed and how cleanly you did it.

#### T1 — Core (UNLOCKED)

**Required.** A submission that does not clear T1 is not judged. This is the floor, not the target.

- Authentication and sessions
- A real role model: visitor, participant, judge, organizer, admin
- Event creation with configurable dates, tracks and prizes
- Team formation by invite link
- Project submission with draft-and-edit until the deadline
- Deadline enforcement that actually holds
- Public gallery with search and filter

> Reference: the submission field set is stable across every platform we studied. Name, tagline, long description, thumbnail, image gallery, hosted demo video URL, repository URL, live link, tech tags, track, plus organizer-defined custom questions.

#### T2 — Judging (UNLOCKED)

Where the real engineering starts.

- Judge invitation and assignment, by batch or algorithmically
- Scoring against a weighted, organizer-configurable rubric. The market leader cannot weight criteria at all, and its closest rival ships one fixed five-criterion rubric that every event on the platform shares
- Role isolation, enforced in the backend. A judge must never see another judge's scores. A track judge must never see another track. If this only works because the UI hides a button, it does not work
- Live progress dashboard so an organizer can see who has not started
- Cross-judge normalization, with your method documented and defended
- CSV export at every stage

> Fig. 02 adjacent concept — Role isolation matrix (backend-enforced): VISITOR/PARTICIPANT deny everything (own scores, peer scores, other track, aggregate, audit log). JUDGE permits only own scores. ORGANIZER and ADMIN permit all. Denied at the API, not in the UI. Verified by acceptance suite test `T2.03`.

> Fig. 04 — Judge assignment / batched, disjoint, no judge sees a peer's ballot. E.g. 40 projects · 30 judges · 3 reviews per project.

#### T3 — Public (UNLOCKED)

- Community voting with configurable access: open link, email-gated, or authenticated
- Or something better than one-person-one-vote, if you can defend it. Quadratic voting (n votes on one project costs the square root of n in influence) is the most credible attempt anyone has shipped at stopping a loud minority from deciding the outcome
- Comments on gallery projects
- Results hidden from everyone but organizers during the voting window
- Randomised project ordering on ballots, to kill position bias
- Anti-abuse that means something: rate limits, duplicate detection, and an audit trail an organizer can read without a database client

#### T4 — Stretch (UNLOCKED)

- A REST API and webhooks covering every action the UI can take
- Certificate and record generation
- Signed, publicly verifiable judge participation records
- An embeddable gallery widget
- Bulk import and export, so an organizer can leave as easily as they arrived

> **Climb honestly.** A clean, correct T2 scores above a broken T4 every time. Judges are reading for what works, not what is listed in your README.

### 05 / What counts as done

The one rule that makes this judgeable, verifiable in about a minute:

> `docker compose up` produces a working portal. On localhost. Seeded with the fixture data we publish at kickoff. No cloud account, no API key, no external service, no signup.

The acceptance suite runs against your build and prints a tier-by-tier pass report. Publish that output in your repository. A judge should be able to confirm which tier you reached without reading a line of your code.

**Closed loopholes, named up front:**

- A hosted database service is a dependency on someone else's uptime and someone else's invoice. It must run locally.
- Authentication-as-a-service is the same problem wearing a nicer hat. Build it or use something self-hosted.
- A staging URL is not a submission. We need to run it, not visit it.
- "Works on my machine" has never once been true.

> If it does not come up on a laptop with the network off, we cannot adopt it, and adoption is the entire point of the event.

### 06 / Deliverables

After 72 hours we want software an organizer could run. Not a design system. Not a slide deck.

- **A working portal.** It starts with one command, seeds itself, and takes a project from submission through judging to published results.
- **An acceptance report.** The output of our suite against your build, committed to the repository. Your tier claim and your receipt at the same time.
- **Honest documentation.** `ARCHITECTURE.md` for how it fits together, `DATA-MODEL.md` for the schema and how an organizer gets data in and out, `JUDGING.md` for your scoring maths.

You'll submit:

- Public GitHub repo under an OSI-approved license
- `docker compose up` to a seeded, working portal
- `acceptance-report.txt`: the suite output, tier by tier
- `README.md`: what it does, how to run it, what it does not do yet
- `ARCHITECTURE.md`: the shape of the system and why
- `DATA-MODEL.md`: schema, plus import and export paths
- `JUDGING.md`: assignment strategy, scoring maths, normalization method, defended
- 5-minute demo video walking one full event lifecycle: create, submit, judge, publish

**Anatomy of a submission:**

```text
 your-portal/
 ├── README.md              ← what it does, how to run, honest limits
 ├── ARCHITECTURE.md        ← the shape of the system and why
 ├── DATA-MODEL.md          ← schema, import and export paths
 ├── JUDGING.md             ← assignment, scoring maths, normalization
 ├── docker-compose.yml     ← one command to a seeded, running portal
 ├── src/                   ← your code, all of it written this weekend
 ├── tests/                 ← your own tests, beyond the acceptance suite
 ├── acceptance-report.txt  ← our suite's output, tier by tier
 ├── LICENSE                ← MIT or Apache-2.0
 └── .dogfood.toml          ← tiers claimed, one-line pitch
```

- **One command runs it.** If a judge has to read your CI config to figure out how to start it, you have failed this rule.
- **The acceptance report is the receipt.** Claim T3 in your README and pass T2 in the report, and you score T2 with a note about the gap.
- **JUDGING.md counts.** It feeds straight into Judging Integrity (25%). "We averaged the scores" is an answer, and it is a weak one. Tell us what you did about the judge who marks everything a 3.
- **Honest tier claims beat inflated ones.** A team that says "we reached T2, here is the T3 work we started and did not finish" scores above a team claiming T4 with three broken endpoints.
- Layout is advisory. Judges read what you actually ship.

### 07 / Scoring

Each project is rated on a **5-point scale across four weighted criteria**. Final ranking is the weighted average across all judges who evaluated the project.

| Criterion | Weight | What it means |
|---|---|---|
| **Tier Completion & Correctness** | 40% | How far up the ladder you got, verified by the acceptance suite rather than by your README. T1 is a gate, not a score. Correctness beats breadth. Honest gap reporting is rewarded, inflated claims are penalised here. |
| **Judging Integrity** | 25% | Role isolation enforced in the backend, not painted on the frontend. Normalization documented and defensible, not "we averaged the scores". An audit trail an organizer can actually read. Vote abuse thought about before a judge asked. |
| **Adoptability & Operability** | 20% | Could we run this on Monday? One command to running. Seeded with real data. Documentation a stranger can follow. A migration path in and out — a platform you cannot leave is a trap. A clean license with no surprises. |
| **Code Quality & Innovation** | 15% | Idiomatic to a senior reviewer in your stack. A schema a database person would defend. The decision that made a judge stop and say they would steal it. |

> Fig. 03 — Weight distribution. Sum = 100, scale 1–5. Illustrated with a fixture set of 40 projects: raw judge spread σ = 0.94 (uncalibrated) → normalized σ = 0.31 (method documented); rank movement shown (e.g. ▲4 project 17, ▲1 project 04, ▼3 project 22, ▼6 project 09).

**Bonus challenges — optional, pick one and nail it, don't half-do all four:**

| Challenge | Difficulty | Points |
|---|---|---|
| Normalization Proof | Hard | +5 |
| Pairwise Mode | Hard | +5 |
| Threat Model | Medium | +3 |
| API First | Medium | +3 |

+16 maximum if you took all four. Nobody should. **Bonuses break ties. They do not change your score. One done properly beats four started.**

- **Normalization Proof (+5, Hard).** Implement cross-judge score normalization and prove it works on the fixture data. Show the raw scores, the normalized scores, and the ranking change. Document the method well enough that a statistician would not wince. Every commercial platform claims to do this and none of them will tell you how.
- **Pairwise Mode (+5, Hard).** Ship pairwise comparison as an alternative judging mode: show a judge two projects, ask which is better, recover a global ranking with a Bradley-Terry style estimator. The Gavel approach — sidesteps cross-judge calibration entirely by never asking for an absolute score. Hard to get right, extremely satisfying when it works.
- **Threat Model (+3, Medium).** A written, defensible threat model for voting and submission abuse. Sybil votes, ballot stuffing, submission scraping, judge collusion, deadline gaming. Name the attacks you stopped, and name the ones you did not. The honest list is worth more than the heroic one.
- **API First (+3, Medium).** Every action available in the UI is available through a documented API, with a published OpenAPI spec. Nobody else in this category has one. Be the first.

### 08 / Out of scope

Save yourself the trouble — nine ways to score nothing:

1. Design mockups, Figma files, or a frontend with hardcoded data behind it
2. Anything that needs a cloud account, a hosted database, or an auth provider to start
3. An authentication demo that stops at the login screen
4. A gallery with no judging, or judging with no gallery — this is one product
5. Role checks that live only in the frontend — if you can `curl` another judge's scores it is not isolation
6. LLM dumps with no architecture document and nobody able to defend the schema in writing
7. Closed source, or a license that is not OSI-approved
8. Anything requiring custom hardware, GUI toolchains, or proprietary services — keep it laptop-friendly
9. A rewrite of an existing open-source platform with the name changed

### 09 / Timeline (all times UTC, 2026)

**The 72-hour window** — T-0 = 25.09.2026 / 18:00 UTC:

```
T-0  KICKOFF                    +24H                  +48H                  +72H FREEZE
     SCHEMA / AUTH / SUBMISSION JUDGING/NORMALIZATION ACCEPTANCE / DOCS / VIDEO
```

| When | What |
|---|---|
| **Pre-event** | |
| AUG 24, 2026 | Registration opens. Join the Discord, start sketching your schema. |
| SEP 04, 2026 | Judging panel announced. |
| SEP 21, 2026 | Team formation. 1–4 people per team. Solo welcome. |
| SEP 23, 2026 | Raptors Conference, online and free. |
| SEP 24, 2026 | `spec.md` published. Read it before the clock starts. No code yet. |
| **Hackathon · 72h** | |
| SEP 25, 2026 @ 18:00 UTC | **Kickoff.** `fixtures.json` and the acceptance suite released. Hacking begins. |
| SEP 28, 2026 @ 18:00 UTC | **Code freeze.** Submissions due. Acceptance reports verified. |
| **Post-event** | |
| SEP 28 → OCT 08, 2026 | Judging window. Each project reviewed independently by multiple judges on structured forms. Weighted scores and written feedback to every team. |
| OCT 05, 2026 @ 18:00 UTC | The Write Up Quest closes. |
| OCT 09, 2026 | Winners announced. Adoption decision announced with them. |

### 10 / Prizes — $2,500 total pool

| Place | Amount | Share |
|---|---|---|
| 1st — Grand Prize | $800 | 32% |
| 2nd — Runner-Up | $500 | 20% |
| 3rd Place | $350 | 14% |
| 4th Place | $200 | 8% |
| 5th Place | $150 | 6% |
| Best Judging Engine | $100 | 4% |
| Write Up Quest — $100 × 4 | $400 | 16% |

- **1st / $800.** Grand Prize, and the one we run. The portal that cleared the ladder honestly, enforced its own rules in the backend, started with one command, and read like software somebody intends to maintain. This is the project Hackathon Raptors forks and puts into production.
- **2nd / $500.** Runner-Up. Exceptional work across the board. Strong tier completion, defensible judging maths, documentation that respects the reader.
- **3rd / $350.** A standout, either for how far it climbed in 72 hours or for one decision nobody else made.
- **4th / $200.** Finished the climb and left something behind worth reading. Solid tier completion, honest scope, no shortcuts hiding in the backend.
- **5th / $150.** Made the top five out of everyone who started.
- **Best Judging Engine / $100.** The team whose judging layer was the most defensible. Assignment strategy, normalization method, role isolation, audit trail. The category prize for the problem the whole industry quietly avoids.
- **Write Up Quest / $400 (side quest, $100 × 4).** Building a platform in 72 hours is hard. Explaining what actually happened is rarer, and more useful to everyone else. So we are paying for it.
  - **What it is:** Publish a write-up of your build — the schema you would redo, the normalization maths that fought you and won, the role-isolation bug you found at hour 60, the feature you cut and do not regret, the part where you realised the spec was harder than it looked.
  - **How they are judged:** On insight, not follower count. Technical substance: the debugging story, the benchmark that disappointed you, the design you abandoned and why. Small accounts, this one is winnable.
  - **Where:** X, LinkedIn, Dev.to, your own blog, any developer-focused platform. Tag Hackathon Raptors.
  - **Prize:** Top 4 write-ups, $100 each.
  - **When:** Write any time from kickoff. Submissions close October 5, 18:00 UTC. Winners announced October 9.
  - *Optional. Does not affect your main score.*

### 11 / Rules — checklist, 09 items

> If we cannot run it, we cannot adopt it. Every rule below is downstream of that one.

1. **Open Source, OSI-Approved.** MIT or Apache-2.0 preferred. Public at submission. You keep ownership. No assignment, transfer, or CLA.
2. **One Command To Running.** `docker compose up` brings up a working, seeded portal on a laptop. No cloud account, no hosted service, no external API.
3. **Clear T1 Or You Are Not Judged.** T1 is the floor: auth, roles, event, submission, gallery. A project that does not reach it is not scored, however good the parts are.
4. **New Code Only.** All project code written during the 72-hour window. Frameworks, libraries, boilerplate generators and AI assistance are all fair game. A pre-existing project, or an existing open-source platform with the name changed, is not.
5. **No Hosted-Service Dependency.** It runs offline on a laptop. This is the condition for the winner being adoptable at all.
6. **Claim Your Tiers Honestly.** Declare the tiers you reached in `.dogfood.toml`. The acceptance report is the receipt. Overclaiming costs more than the tier was worth.
7. **Team Size.** 1–4 people. Solo entries welcome; the brief rewards a pair.
8. **Source Code Public.** GitHub repository, public at submission. Anonymous-username submissions accepted, but the team must be reachable for written follow-up by judges during the evaluation window.
9. **AI Tools Are Expected.** Claude Code, Cursor, Aider, Copilot, local models — bring whatever you have. We gatekeep on whether the thing holds up and whether somebody can defend the schema in writing. The acceptance report, `ARCHITECTURE.md` and `JUDGING.md` are the receipts.

### 12 / Who this is for

- **Full-Stack Builders** — a whole product in a weekend: auth, roles, forms, gallery, dashboards, exports. Start at T1 → T2.
- **Backend & API Engineers** — role isolation that survives a curl, assignment algorithms, an export path that does not lose data, an API nobody else in this category bothered to build. Start at T2 → T4.
- **Frontend & Design-System People** — the judge console and the public gallery are the product. Thirty projects to score in five hours is a UX problem before it is anything else. Start at T1 → T3.
- **Data & Algorithms People** — cross-judge normalization and pairwise ranking, the two Hard bonuses. Bradley-Terry, Crowd-BT, or something better you can defend. Start at T2 + bonuses.
- **Security Engineers** — role isolation, vote abuse, sybil resistance, audit trails. Every platform treats community voting as a known-gameable feature they mitigate with policy rather than engineering. Do better. Start at T2 → T3 + Threat Model.
- **DevOps & Self-Hosting Folks** — "one command to running" is 20% of the score and the reason the winner gets adopted. Start at T1 → adoptability.

### 13 / Judges

- **3** reviews per project
- **36** panel seats
- **11d** evaluation window
- Panel review: every project reviewed independently, on structured forms, across the window. Judges never see one another's ballots — the platform you build has to hold that line too. Weighted scores and written feedback go to every team, placed or not.
- Evaluation: 29.09 – 08.10.2026.

**Panel (seated):** Anuj Kapoor (Microsoft), Smit Nitinkumar Shah (Microsoft), Rupesh Kumar Prasad (Analog Devices), Narasimha Reddy Annapareddy (ChargePoint), Hari Krishna Bethanaboina (Martin Marietta Materials), Igor Malovytsia (GuardSpine), Rushikesh Hayatnagarkar, Konstantin Mishukov (Yandex Market / Sberbank), Nail Iarmukhametov (Kubernetes/AWS/Azure), plus the rest of the panel: Sourav Sinha (AWS), Nikolai Sidiropulo (Meta), Anton Musatov (Digitail), Arun Kumar Kaliamoorthy (GoDaddy), Dmitriy Fedoryshchev (EverCommerce), Dmitry Gusev (Avito), Dmitry Kuznetsov (FunnelFox), Gautam Siddhartha (Walmart), Ivan Antropov (T-Bank), Jose Galarza (Wise), Kadharmoideen Fadurudeen (Adobe), Nikolay Dolgov (The Lightning Group), Pavani Totli Kuruba (Lululemon), Shon Thomas (Yahoo), Shriniwas Phalke (Walmart Global Tech), Soumyajit Mukherjee (Shutterfly), Stanislav Korolev (Avito), Tomasz Kubiak (Welltech), Kursad Alsan, Manish Gupta, Manpreet Kaur, Pramodini Girish Mahendrakar, Pritesh Gehlot, Rajasree Pachuveetil, Reeshav Kumar, Shashank Shekhar, Sonali Priya.

### 14 / FAQ

- What's the team size limit?
- Can I use AI code generation?
- Can I use a framework, an ORM, a boilerplate generator?
- What if I only reach T2?
- Does design count?
- What exactly is in the fixture data?
- What is the acceptance suite?
- Can I start coding before September 25?
- Do I have to use Docker specifically?
- What license do I have to use?
- What does Raptors actually do with the winner?
- Do I keep ownership?
- What if two entries are both worth adopting?

### 15 / Why now

Every hackathon platform in the world converged on the same nine features, and then stopped moving.

- The category leader still cannot weight judging criteria and tells organizers to use a spreadsheet instead.
- Score normalization, the one genuinely hard statistical problem in the whole domain, is advertised as a feature by multiple platforms and documented by none of them.
- Community voting is treated as an unsolvable abuse surface to be managed with small prizes and hidden results rather than fixed with engineering.
- Pricing is sales-gated across the board, so a volunteer organizer running a free event cannot even find out what it costs.
- After fifteen years and millions of developers, not one of them ships a public API, leaving an entire industry to integrate through screen scrapers and downloaded spreadsheets.

The open-source alternatives are better than their reputation — Gavel brought a real idea from mathematical psychology into judging and has been quietly producing fairer rankings at HackMIT for years. JunctionApp, Dribdat, Quill and Hibiscus are all real and all self-hostable. What is missing is a modern one, assembled as a whole, that a working organizer can deploy without becoming its maintainer.

> Generating a CRUD app is trivial now. Building an evaluation system that is fair, that enforces its own rules, that an organizer can actually operate, and that you can hand to someone else without a handover call, is the part that still takes engineers.

**That is the hackathon. 72 hours. One product. We run the winner.**

## References

1. Devpost, "Judging & public voting" — equally-weighted criteria only, offline judging required for weights; ~5 hours to score 30 projects; public-vote fraud guidance. `help.devpost.com`
2. Devpost, "7 key features to consider when choosing your hackathon platform provider". `info.devpost.com`
3. Devpost for Teams, "New voting, guest access, and setup features". `info.devpost.com`
4. Devpost, "Know your submission steps" — the full submission field set. `help.devpost.com`
5. MLH Organizer Guide, "Using Devpost". `guide.mlh.com`
6. Devfolio, "Devfolio's stack of features". `devfolio.co`
7. Devfolio, "Organizer judging". `guide.devfolio.co`
8. Devfolio, "Judging" — the fixed five-criterion rubric. `guide.devfolio.co`
9. DoraHacks — 700+ hackathons, 32,000+ projects, BUIDL AI automated review and AI judging. `dorahacks.io`
10. DoraHacks, "Building effective on-chain governance mechanisms". `dorahacks.io`
11. HackerEarth, "11 best hackathon platforms for enterprise in 2026". `hackerearth.com`
12. Gavel, HackMIT's pairwise-comparison judging system (Crowd-BT / Bradley-Terry estimator). `github.com/anishathalye/gavel`
13. awesome-hackathon, curated list of open-source, self-hostable hackathon platforms and tools. `github.com/dribdat/awesome-hackathon`
14. Unofficial Devpost API, a scraper-based community project standing in for the API that does not exist. `github.com/ViRb3/devpost-api`
15. Hackathon Raptors event archive, 35 events from September 2023 to July 2026. `raptors.dev`

---

**DOGFOOD**® — A raptors.dev hackathon. Build the submission and judging platform we will actually run. Open source, self-hosted, yours.

Hackathon Raptors · Community Interest Company 15557917 · Office 2131, 182–184 High Street North, East Ham, London, E6 2JA, United Kingdom · hello@raptors.dev · 35 events since 2023 · 85+ countries · © 2026 Dogfood Hackathon · Built by raptors.dev