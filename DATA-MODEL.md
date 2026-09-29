# Data Model

All tables are defined in `packages/db/src/schema/`.  This document describes
the purpose of each table, its important fields, and the invariants enforced at
the database layer.

---

## Tables

### `userProfile`

Extends Better Auth's `user` table with application-specific fields.

| Column | Type | Notes |
|---|---|---|
| `userId` | text PK | FK → `user.id` (Better Auth) |
| `role` | enum | `visitor \| participant \| judge \| organizer \| admin` · default `participant` |
| `bio` | text | Optional |
| `avatarUrl` | text | Optional |
| `githubUrl` | text | Optional |
| `websiteUrl` | text | Optional |
| `updatedAt` | timestamp | |

Role is stored here, not in the session token.  Every protected procedure
resolves the caller's role by joining on this table.

---

### `event`

The central entity.  Everything else hangs off it.

| Column | Type | Notes |
|---|---|---|
| `id` | text PK | |
| `slug` | text | Unique — used in URLs |
| `name` | text | |
| `organizerId` | text | FK → `user.id` |
| `status` | enum | `draft → registration → submission → judging → results → archived` |
| `registrationStartAt` | timestamp | Nullable |
| `registrationEndAt` | timestamp | Nullable |
| `submissionStartAt` | timestamp | Nullable |
| `submissionDeadline` | timestamp | Enforced by `assertSubmissionOpen` |
| `judgingStartAt` | timestamp | Nullable |
| `judgingEndAt` | timestamp | Nullable |
| `isPublic` | bool | Controls gallery visibility |
| `judgingResultsVisible` | bool | Controls whether results endpoint is public |
| `votingMode` | enum | `disabled \| open \| authenticated` |
| `votingResultsVisible` | bool | |
| `maxTeamSize` | int | Default 4 |
| `minTeamSize` | int | Default 1 |
| `allowIndividuals` | bool | Default true |
| `requireEmailVerification` | bool | Default false |
| `customQuestions` | jsonb | `Array<{id, label, type, required}>` |

---

### `track`

Optional sub-category within an event (e.g. "Developer tools", "Climate").

| Column | Type | Notes |
|---|---|---|
| `id` | text PK | |
| `eventId` | text | FK → `event.id` cascade |
| `name` | text | |
| `description` | text | Nullable |
| `sortOrder` | int | Default 0 |
| `maxSubmissions` | int | Nullable — per-track cap |

---

### `prize`

Prizes are informational; they do not drive scoring logic.

| Column | Type | Notes |
|---|---|---|
| `id` | text PK | |
| `eventId` | text | FK → `event.id` cascade |
| `trackId` | text | FK → `track.id` nullable (event-wide prize if null) |
| `name` | text | |
| `value` | text | Nullable — human-readable amount |
| `currency` | text | Default "USD" |
| `sortOrder` | int | |

---

### `team`

| Column | Type | Notes |
|---|---|---|
| `id` | text PK | |
| `eventId` | text | FK → `event.id` cascade |
| `name` | text | |
| `description` | text | Nullable |
| `ownerId` | text | FK → `user.id` |
| `createdAt` | timestamp | |
| `updatedAt` | timestamp | |

---

### `teamMember`

| Column | Type | Notes |
|---|---|---|
| `teamId` | text | FK → `team.id` cascade |
| `userId` | text | |
| `joinedAt` | timestamp | |

**Uniqueness constraint:** `team_member_unique (teamId, userId)` — a user can
only be a member of a given team once.

---

### `teamInvitation`

| Column | Type | Notes |
|---|---|---|
| `id` | text PK | |
| `teamId` | text | FK → `team.id` cascade |
| `eventId` | text | FK → `event.id` cascade |
| `token` | text | Unique — opaque random token |
| `invitedEmail` | text | Nullable — email hint if set |
| `invitedUserId` | text | Nullable — pre-targeted invite |
| `invitedByUserId` | text | |
| `status` | enum | `pending \| accepted \| declined \| revoked \| expired` |
| `expiresAt` | timestamp | 72 hours from creation |
| `respondedAt` | timestamp | Nullable |

The token is the shareable opaque identifier.  The acceptance endpoint
(`POST /teams/invitations/accept`) validates expiry and status before
joining the user to the team.

---

### `submission`

| Column | Type | Notes |
|---|---|---|
| `id` | text PK | |
| `eventId` | text | FK → `event.id` cascade |
| `teamId` | text | FK → `team.id` nullable (null for solo submissions) |
| `submitterId` | text | FK → `user.id` |
| `trackId` | text | FK → `track.id` nullable |
| `name` | text | Project name |
| `tagline` | text | Nullable |
| `description` | text | Nullable |
| `repositoryUrl` | text | Nullable |
| `liveDemoUrl` | text | Nullable |
| `demoVideoUrl` | text | Nullable |
| `thumbnailUrl` | text | Nullable |
| `galleryImageUrls` | jsonb | `string[]` |
| `techTags` | jsonb | `string[]` |
| `customAnswers` | jsonb | `Array<{questionId, answer}>` |
| `status` | enum | `draft \| submitted \| locked \| disqualified` |
| `submittedAt` | timestamp | Nullable |
| `lockedAt` | timestamp | Nullable |

**Uniqueness constraint:** `submission_team_event_unique (teamId, eventId)` —
one submission per team per event.  This is the constraint that makes `prj_41`
in the fixture intentionally unstorable.

---

### `rubric`

| Column | Type | Notes |
|---|---|---|
| `id` | text PK | |
| `eventId` | text | FK → `event.id` cascade |
| `trackId` | text | FK → `track.id` nullable — null means event-wide rubric |
| `name` | text | |
| `description` | text | Nullable |
| `isWeighted` | bool | Default true — if true, criterion weights must sum to 100 |
| `createdAt` | timestamp | |
| `updatedAt` | timestamp | |

When `trackId` is null, the rubric applies to all submissions in the event that
are not covered by a more-specific track rubric.  Track-specific rubrics take
priority.

---

### `rubricCriterion`

| Column | Type | Notes |
|---|---|---|
| `id` | text PK | |
| `rubricId` | text | FK → `rubric.id` cascade |
| `name` | text | |
| `description` | text | Nullable |
| `weight` | numeric(5,2) | Share of the total score (0–100) |
| `minScore` | int | Default 0 |
| `maxScore` | int | Default 10 |
| `sortOrder` | int | Default 0 |

For weighted rubrics (`isWeighted = true`), the sum of all criteria weights
must equal 100.  This is enforced in the `rubrics.create` service and
validated in the frontend editor before submission.

---

### `judgeAssignment`

| Column | Type | Notes |
|---|---|---|
| `id` | text PK | |
| `eventId` | text | FK → `event.id` cascade |
| `judgeId` | text | FK → `user.id` |
| `submissionId` | text | FK → `submission.id` cascade |
| `trackId` | text | FK → `track.id` nullable |
| `status` | enum | `pending \| in_progress \| completed \| skipped` |
| `assignedAt` | timestamp | |
| `completedAt` | timestamp | Nullable |

**Uniqueness constraint:** `judge_assignment_unique (judgeId, submissionId)` —
a judge can only be assigned to a given submission once.  This is the anti-
duplicate-assignment guard.

---

### `score`

| Column | Type | Notes |
|---|---|---|
| `id` | text PK | |
| `assignmentId` | text | FK → `judgeAssignment.id` cascade |
| `eventId` | text | FK → `event.id` cascade |
| `judgeId` | text | |
| `submissionId` | text | FK → `submission.id` cascade |
| `rubricId` | text | FK → `rubric.id` restrict |
| `criterionScores` | jsonb | `Array<{criterionId: string, score: number}>` |
| `totalScore` | numeric(8,4) | Weighted sum — stored for performance |
| `feedback` | text | Nullable |
| `isLocked` | bool | Default false — set by `lockScores` |
| `submittedAt` | timestamp | |
| `updatedAt` | timestamp | |

**Uniqueness constraint:** `score_assignment_unique (assignmentId)` — one
score record per assignment.  Subsequent submissions upsert the same row.

`isLocked` is set event-wide by the organizer via `lockScores`.  Once locked,
the scoring UI disables all inputs and the submit button, and the service
rejects further updates.

---

### `vote`

| Column | Type | Notes |
|---|---|---|
| `id` | text PK | |
| `eventId` | text | FK → `event.id` cascade |
| `submissionId` | text | FK → `submission.id` cascade |
| `voterId` | text | FK → `user.id` |
| `createdAt` | timestamp | |

**Uniqueness constraint:** `vote_voter_submission_unique (voterId, submissionId)` —
one vote per voter per submission.  The anti-stuffing guard.

---

### `comment`

| Column | Type | Notes |
|---|---|---|
| `id` | text PK | |
| `eventId` | text | FK → `event.id` cascade |
| `submissionId` | text | FK → `submission.id` cascade |
| `authorId` | text | FK → `user.id` |
| `content` | text | |
| `isDeleted` | int | 0 or 1 — soft delete |
| `deletedAt` | timestamp | Nullable |
| `deletedByUserId` | text | Nullable — supports moderation |
| `createdAt` | timestamp | |
| `updatedAt` | timestamp | |

---

### `auditLog`

Every mutating operation writes an audit entry via `writeAudit(ctx, …)`.

| Column | Type | Notes |
|---|---|---|
| `id` | text PK | |
| `action` | text | e.g. `"team.create"`, `"results.compute"` |
| `actorId` | text | Nullable — null for unauthenticated system actions |
| `actorRole` | text | Snapshot of role at time of action |
| `eventId` | text | Nullable |
| `resourceType` | text | e.g. `"team"`, `"submission"` |
| `resourceId` | text | Nullable |
| `metadata` | jsonb | Action-specific details |
| `ipAddress` | text | Nullable |
| `userAgent` | text | Nullable |
| `createdAt` | timestamp | Indexed — used for time-range queries |

---

## Key invariants

### Anti-abuse uniqueness constraints

| Constraint | Table | Columns | Purpose |
|---|---|---|---|
| `vote_voter_submission_unique` | `vote` | `(voterId, submissionId)` | One vote per user per submission |
| `judge_assignment_unique` | `judgeAssignment` | `(judgeId, submissionId)` | No duplicate assignments |
| `score_assignment_unique` | `score` | `(assignmentId)` | One score record per assignment; updates upsert |
| `submission_team_event_unique` | `submission` | `(teamId, eventId)` | One submission per team per event |
| `team_member_unique` | `teamMember` | `(teamId, userId)` | No duplicate memberships |

### Deadline enforcement: `assertSubmissionOpen`

Defined in `apps/server/src/features/submissions/helpers.ts`.

Every submission create, update, and status-change that involves a `submitted`
state calls `assertSubmissionOpen(ctx, eventId)`.  This function:

1. Loads `event.status`, `event.submissionDeadline`, and
   `event.submissionStartAt` from the database.
2. Rejects with a **400 Bad Request** if:
   - `event.status` is not `"submission"` or `"registration"`
   - `now > event.submissionDeadline` (deadline has passed)
   - `now < event.submissionStartAt` (window has not opened yet)

The comparison uses `new Date()` — the server clock — not any value supplied
by the client.  A client that manipulates its own clock or sends a forged
timestamp is still blocked by this check.

### Role isolation as a data-visibility property

Role enforcement is not a frontend concern.  Every service function that
accesses restricted data calls one of:

- `requireExactRole(ctx, "judge")` — rejects if caller's `userProfile.role`
  is not exactly `"judge"`.
- `assertEventOrganizer(ctx, eventId)` — checks `eventOrganizer` membership
  or that the caller is the event's `organizerId`.
- `requireUserId(ctx)` — rejects unauthenticated callers.

These guards run inside the service, after the oRPC router has dispatched but
before any database query.  Even if the frontend sends a request it should not
be able to send (e.g. a judge trying to call `scoring.allScores`), the service
layer returns 403 before any data is read.

The isolation is tested independently via three separate code paths in the
acceptance suite:
1. A judge calling `assignments.getAssignedSubmission` for an assignment not
   theirs — returns 403.
2. A judge calling `scoring.allScores` — returns 403.
3. The portal `getJudgeScores` route for a different judge's scores — returns
   403.
