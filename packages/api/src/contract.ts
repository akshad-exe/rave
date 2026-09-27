import type {
  auditLog,
  comment,
  event,
  judgeAssignment,
  prize,
  result,
  rubric,
  rubricCriterion,
  score,
  submission,
  team,
  track,
} from "@rave/db";
import type { z } from "zod";

import type { ServiceContext } from "./context";
import type * as adminSchemas from "./schemas/admin";
import type * as eventSchemas from "./schemas/events";
import type * as exportSchemas from "./schemas/exports";
import type * as judgingSchemas from "./schemas/judging";
import type * as resultSchemas from "./schemas/results";
import type * as submissionSchemas from "./schemas/submissions";
import type * as teamSchemas from "./schemas/teams";
import type * as trackSchemas from "./schemas/tracks";
import type * as votingSchemas from "./schemas/voting";

// ─── Row types ────────────────────────────────────────────────────────────────

type EventRow = typeof event.$inferSelect;
type TrackRow = typeof track.$inferSelect;
type PrizeRow = typeof prize.$inferSelect;
type TeamRow = typeof team.$inferSelect;
type SubmissionRow = typeof submission.$inferSelect;
type RubricRow = typeof rubric.$inferSelect;
type RubricCriterionRow = typeof rubricCriterion.$inferSelect;
type JudgeAssignmentRow = typeof judgeAssignment.$inferSelect;
type ScoreRow = typeof score.$inferSelect;
type ResultRow = typeof result.$inferSelect;
type CommentRow = typeof comment.$inferSelect;
type AuditLogRow = typeof auditLog.$inferSelect;

// ─── Projections ──────────────────────────────────────────────────────────────

type TeamWithMembers = TeamRow & {
  members: Array<{ joinedAt: Date; userId: string }>;
};

type EventListItem = Pick<
  EventRow,
  | "coverImageUrl"
  | "endDate"
  | "id"
  | "maxTeamSize"
  | "name"
  | "slug"
  | "startDate"
  | "status"
  | "submissionDeadline"
  | "tagline"
>;

type GalleryItem = Pick<
  SubmissionRow,
  | "demoVideoUrl"
  | "id"
  | "liveDemoUrl"
  | "name"
  | "repositoryUrl"
  | "submittedAt"
  | "submitterId"
  | "tagline"
  | "teamId"
  | "techTags"
  | "thumbnailUrl"
  | "trackId"
>;

type RubricWithCriteria = RubricRow & { criteria: RubricCriterionRow[] };

type JudgeAssignmentForJudge = Pick<
  JudgeAssignmentRow,
  "assignedAt" | "completedAt" | "id" | "status" | "submissionId" | "trackId"
>;

type JudgeSubmission = Pick<
  SubmissionRow,
  | "customAnswers"
  | "demoVideoUrl"
  | "description"
  | "galleryImageUrls"
  | "id"
  | "liveDemoUrl"
  | "name"
  | "repositoryUrl"
  | "tagline"
  | "techTags"
  | "thumbnailUrl"
  | "trackId"
>;

type OrganizerScoreRow = Pick<
  ScoreRow,
  | "criterionScores"
  | "id"
  | "isLocked"
  | "judgeId"
  | "rubricId"
  | "submissionId"
  | "submittedAt"
  | "totalScore"
>;

type PublishedResultRow = Pick<
  ResultRow,
  | "finalScore"
  | "id"
  | "publishedAt"
  | "rank"
  | "scoreBreakdown"
  | "submissionId"
  | "trackId"
  | "trackRank"
>;

export interface CommentListItem {
  authorId: string;
  content: string;
  createdAt: Date;
  id: string;
  isDeleted: number;
}

export interface UserWithRole {
  createdAt: Date;
  email: string;
  emailVerified: boolean;
  id: string;
  name: string;
  role: string | null;
}

// ─── Events ───────────────────────────────────────────────────────────────────

export interface EventsService {
  create: (
    ctx: ServiceContext,
    input: z.infer<typeof eventSchemas.createEventInput>
  ) => Promise<EventRow>;
  getAdmin: (
    ctx: ServiceContext,
    input: z.infer<typeof eventSchemas.eventIdInput>
  ) => Promise<{ event: EventRow; prizes: PrizeRow[]; tracks: TrackRow[] }>;
  getBySlug: (
    ctx: ServiceContext,
    input: { slug: string }
  ) => Promise<EventRow>;
  list: (
    ctx: ServiceContext,
    input: z.infer<typeof eventSchemas.listEventsInput>
  ) => Promise<{ events: EventListItem[]; limit: number; page: number }>;
  revealResults: (
    ctx: ServiceContext,
    input: z.infer<typeof eventSchemas.eventIdInput>
  ) => Promise<{ ok: boolean }>;
  transition: (
    ctx: ServiceContext,
    input: z.infer<typeof eventSchemas.transitionEventInput>
  ) => Promise<{ status: string }>;
  update: (
    ctx: ServiceContext,
    input: z.infer<typeof eventSchemas.updateEventInput>
  ) => Promise<EventRow>;
}

// ─── Tracks & prizes ──────────────────────────────────────────────────────────

export interface TracksService {
  create: (
    ctx: ServiceContext,
    input: z.infer<typeof trackSchemas.createTrackInput>
  ) => Promise<TrackRow>;
  delete: (
    ctx: ServiceContext,
    input: z.infer<typeof trackSchemas.trackIdInput>
  ) => Promise<{ ok: boolean }>;
  list: (
    ctx: ServiceContext,
    input: z.infer<typeof trackSchemas.eventIdInput>
  ) => Promise<TrackRow[]>;
  update: (
    ctx: ServiceContext,
    input: z.infer<typeof trackSchemas.updateTrackInput>
  ) => Promise<TrackRow>;
}

export interface PrizesService {
  create: (
    ctx: ServiceContext,
    input: z.infer<typeof trackSchemas.createPrizeInput>
  ) => Promise<PrizeRow>;
  delete: (
    ctx: ServiceContext,
    input: z.infer<typeof trackSchemas.prizeIdInput>
  ) => Promise<{ ok: boolean }>;
  list: (
    ctx: ServiceContext,
    input: z.infer<typeof trackSchemas.eventIdInput>
  ) => Promise<PrizeRow[]>;
}

// ─── Teams ────────────────────────────────────────────────────────────────────

export interface TeamsService {
  acceptInvitation: (
    ctx: ServiceContext,
    input: z.infer<typeof teamSchemas.invitationTokenInput>
  ) => Promise<{ teamId: string }>;
  create: (
    ctx: ServiceContext,
    input: z.infer<typeof teamSchemas.createTeamInput>
  ) => Promise<TeamRow>;
  createInvitation: (
    ctx: ServiceContext,
    input: z.infer<typeof teamSchemas.createInvitationInput>
  ) => Promise<{ expiresAt: Date; invitationId: string; token: string }>;
  get: (
    ctx: ServiceContext,
    input: z.infer<typeof teamSchemas.teamIdInput>
  ) => Promise<TeamWithMembers>;
  leave: (
    ctx: ServiceContext,
    input: z.infer<typeof teamSchemas.teamIdInput>
  ) => Promise<{ ok: boolean }>;
  listByEvent: (
    ctx: ServiceContext,
    input: z.infer<typeof teamSchemas.eventIdInput>
  ) => Promise<
    Pick<TeamRow, "description" | "eventId" | "id" | "name" | "ownerId">[]
  >;
  myTeam: (
    ctx: ServiceContext,
    input: z.infer<typeof teamSchemas.eventIdInput>
  ) => Promise<TeamWithMembers | null>;
  removeMember: (
    ctx: ServiceContext,
    input: z.infer<typeof teamSchemas.removeMemberInput>
  ) => Promise<{ ok: boolean }>;
  revokeInvitation: (
    ctx: ServiceContext,
    input: z.infer<typeof teamSchemas.invitationIdInput>
  ) => Promise<{ ok: boolean }>;
  update: (
    ctx: ServiceContext,
    input: z.infer<typeof teamSchemas.updateTeamInput>
  ) => Promise<TeamRow>;
}

// ─── Submissions ──────────────────────────────────────────────────────────────

export interface SubmissionsService {
  create: (
    ctx: ServiceContext,
    input: z.infer<typeof submissionSchemas.createSubmissionInput>
  ) => Promise<SubmissionRow>;
  disqualify: (
    ctx: ServiceContext,
    input: z.infer<typeof submissionSchemas.disqualifySubmissionInput>
  ) => Promise<{ ok: boolean }>;
  gallery: (
    ctx: ServiceContext,
    input: z.infer<typeof submissionSchemas.galleryInput>
  ) => Promise<{ limit: number; page: number; submissions: GalleryItem[] }>;
  get: (
    ctx: ServiceContext,
    input: z.infer<typeof submissionSchemas.submissionIdInput>
  ) => Promise<SubmissionRow>;
  mySubmissions: (
    ctx: ServiceContext,
    input: z.infer<typeof submissionSchemas.mySubmissionsInput>
  ) => Promise<SubmissionRow[]>;
  submit: (
    ctx: ServiceContext,
    input: z.infer<typeof submissionSchemas.submissionIdInput>
  ) => Promise<SubmissionRow>;
  update: (
    ctx: ServiceContext,
    input: z.infer<typeof submissionSchemas.updateSubmissionInput>
  ) => Promise<SubmissionRow>;
}

// ─── Judging: rubrics ─────────────────────────────────────────────────────────

export interface RubricsService {
  create: (
    ctx: ServiceContext,
    input: z.infer<typeof judgingSchemas.createRubricInput>
  ) => Promise<RubricWithCriteria>;
  get: (
    ctx: ServiceContext,
    input: z.infer<typeof judgingSchemas.rubricIdInput>
  ) => Promise<RubricWithCriteria>;
  listByEvent: (
    ctx: ServiceContext,
    input: z.infer<typeof judgingSchemas.eventIdInput>
  ) => Promise<RubricRow[]>;
}

// ─── Judging: assignments ─────────────────────────────────────────────────────

export interface AssignmentDetails {
  assigned: Array<{ judgeId: string; submissionId: string }>;
  skipped: Array<{ judgeId: string; reason: string; submissionId: string }>;
}

export interface AssignmentsService {
  assign: (
    ctx: ServiceContext,
    input: z.infer<typeof judgingSchemas.assignJudgeInput>
  ) => Promise<JudgeAssignmentRow>;
  batchAssign: (
    ctx: ServiceContext,
    input: z.infer<typeof judgingSchemas.batchAssignInput>
  ) => Promise<{
    assigned: number;
    details: AssignmentDetails;
    skipped: number;
  }>;
  getAssignedSubmission: (
    ctx: ServiceContext,
    input: z.infer<typeof judgingSchemas.assignmentIdInput>
  ) => Promise<{ assignment: JudgeAssignmentRow; submission: JudgeSubmission }>;
  myAssignments: (
    ctx: ServiceContext,
    input: z.infer<typeof judgingSchemas.eventIdInput>
  ) => Promise<JudgeAssignmentForJudge[]>;
  myProgress: (
    ctx: ServiceContext,
    input: z.infer<typeof judgingSchemas.eventIdInput>
  ) => Promise<{
    completed: number;
    completionPercent: number;
    in_progress: number;
    pending: number;
    total: number;
  }>;
  progress: (
    ctx: ServiceContext,
    input: z.infer<typeof judgingSchemas.eventIdInput>
  ) => Promise<{
    byJudge: Record<
      string,
      { completed: number; in_progress: number; pending: number; total: number }
    >;
    completed: number;
    completionPercent: number;
    remaining: number;
    total: number;
  }>;
}

// ─── Judging: scoring ─────────────────────────────────────────────────────────

export interface ScoringService {
  allScores: (
    ctx: ServiceContext,
    input: z.infer<typeof judgingSchemas.eventIdInput>
  ) => Promise<OrganizerScoreRow[]>;
  getMyScore: (
    ctx: ServiceContext,
    input: z.infer<typeof judgingSchemas.assignmentIdInput>
  ) => Promise<ScoreRow | null>;
  lockScores: (
    ctx: ServiceContext,
    input: z.infer<typeof judgingSchemas.eventIdInput>
  ) => Promise<{ ok: boolean }>;
  submit: (
    ctx: ServiceContext,
    input: z.infer<typeof judgingSchemas.submitScoreInput>
  ) => Promise<ScoreRow>;
}

// ─── Results ──────────────────────────────────────────────────────────────────

export interface ResultsService {
  compute: (
    ctx: ServiceContext,
    input: z.infer<typeof resultSchemas.computeResultsInput>
  ) => Promise<{ computed: number; useNormalization: boolean }>;
  getAdmin: (
    ctx: ServiceContext,
    input: z.infer<typeof resultSchemas.adminResultsInput>
  ) => Promise<ResultRow[]>;
  getPublished: (
    ctx: ServiceContext,
    input: z.infer<typeof resultSchemas.publishedResultsInput>
  ) => Promise<{ limit: number; page: number; results: PublishedResultRow[] }>;
}

// ─── Voting & comments ────────────────────────────────────────────────────────

export interface VotingService {
  counts: (
    ctx: ServiceContext,
    input: z.infer<typeof votingSchemas.voteCountsInput>
  ) => Promise<Array<{ submissionId: string; votes: number }>>;
  myVotes: (
    ctx: ServiceContext,
    input: z.infer<typeof votingSchemas.eventIdInput>
  ) => Promise<Array<{ createdAt: Date; submissionId: string }>>;
  unvote: (
    ctx: ServiceContext,
    input: z.infer<typeof votingSchemas.unvoteInput>
  ) => Promise<{ ok: boolean }>;
  vote: (
    ctx: ServiceContext,
    input: z.infer<typeof votingSchemas.voteInput>
  ) => Promise<{ ok: boolean }>;
}

export interface CommentsService {
  create: (
    ctx: ServiceContext,
    input: z.infer<typeof votingSchemas.createCommentInput>
  ) => Promise<CommentRow>;
  delete: (
    ctx: ServiceContext,
    input: z.infer<typeof votingSchemas.commentIdInput>
  ) => Promise<{ ok: boolean }>;
  list: (
    ctx: ServiceContext,
    input: z.infer<typeof votingSchemas.listCommentsInput>
  ) => Promise<CommentListItem[]>;
}

// ─── Exports ──────────────────────────────────────────────────────────────────

export interface ExportsService {
  assignments: (
    ctx: ServiceContext,
    input: z.infer<typeof exportSchemas.eventIdInput>
  ) => Promise<{ csv: string }>;
  rawScores: (
    ctx: ServiceContext,
    input: z.infer<typeof exportSchemas.eventIdInput>
  ) => Promise<{ csv: string }>;
  results: (
    ctx: ServiceContext,
    input: z.infer<typeof exportSchemas.eventIdInput>
  ) => Promise<{ csv: string }>;
  submissions: (
    ctx: ServiceContext,
    input: z.infer<typeof exportSchemas.eventIdInput>
  ) => Promise<{ csv: string }>;
  teams: (
    ctx: ServiceContext,
    input: z.infer<typeof exportSchemas.eventIdInput>
  ) => Promise<{ csv: string }>;
}

// ─── Admin / users ────────────────────────────────────────────────────────────

export interface AdminService {
  auditLog: (
    ctx: ServiceContext,
    input: z.infer<typeof adminSchemas.auditLogInput>
  ) => Promise<AuditLogRow[]>;
  listUsers: (
    ctx: ServiceContext,
    input: z.infer<typeof adminSchemas.listUsersInput>
  ) => Promise<UserWithRole[]>;
  platformAuditLog: (
    ctx: ServiceContext,
    input: z.infer<typeof adminSchemas.platformAuditLogInput>
  ) => Promise<AuditLogRow[]>;
  setRole: (
    ctx: ServiceContext,
    input: z.infer<typeof adminSchemas.setRoleInput>
  ) => Promise<{ ok: boolean }>;
}

// ─── Aggregate ────────────────────────────────────────────────────────────────

export interface Services {
  admin: AdminService;
  assignments: AssignmentsService;
  comments: CommentsService;
  events: EventsService;
  exports: ExportsService;
  prizes: PrizesService;
  results: ResultsService;
  rubrics: RubricsService;
  scoring: ScoringService;
  submissions: SubmissionsService;
  teams: TeamsService;
  tracks: TracksService;
  voting: VotingService;
}
