import { protectedProcedure } from "../index";
import {
  assignJudgeInput,
  assignmentIdInput,
  batchAssignInput,
  createRubricInput,
  eventIdInput,
  rubricIdInput,
  submitScoreInput,
} from "../schemas/judging";

// ─── Rubric management ────────────────────────────────────────────────────────

export const rubricRouter = {
  // Organizer: create a rubric
  create: protectedProcedure
    .route({
      method: "POST",
      path: "/events/{eventId}/rubrics",
      summary: "Create a rubric",
      tags: ["Rubrics"],
    })
    .input(createRubricInput)
    .handler(({ context, input }) =>
      context.services.rubrics.create(context, input)
    ),

  // Get rubric with criteria
  get: protectedProcedure
    .route({
      method: "GET",
      path: "/rubrics/{rubricId}",
      summary: "Get a rubric with its criteria",
      tags: ["Rubrics"],
    })
    .input(rubricIdInput)
    .handler(({ context, input }) =>
      context.services.rubrics.get(context, input)
    ),

  // List rubrics for event
  listByEvent: protectedProcedure
    .route({
      method: "GET",
      path: "/events/{eventId}/rubrics",
      summary: "List rubrics for an event",
      tags: ["Rubrics"],
    })
    .input(eventIdInput)
    .handler(({ context, input }) =>
      context.services.rubrics.listByEvent(context, input)
    ),
};

// ─── Assignment management ────────────────────────────────────────────────────

export const assignmentsRouter = {
  // Organizer: assign judge to submission
  assign: protectedProcedure
    .route({
      method: "POST",
      path: "/events/{eventId}/assignments",
      summary: "Assign a judge to a submission",
      tags: ["Assignments"],
    })
    .input(assignJudgeInput)
    .handler(({ context, input }) =>
      context.services.assignments.assign(context, input)
    ),

  // Organizer: batch assign N judges to all/filtered submissions
  batchAssign: protectedProcedure
    .route({
      method: "POST",
      path: "/events/{eventId}/assignments/batch",
      summary: "Batch assign judges to submissions",
      tags: ["Assignments"],
    })
    .input(batchAssignInput)
    .handler(({ context, input }) =>
      context.services.assignments.batchAssign(context, input)
    ),

  // Judge: get assigned submission details (with isolation check)
  getAssignedSubmission: protectedProcedure
    .route({
      method: "GET",
      path: "/assignments/{assignmentId}/submission",
      summary: "Get your assigned submission details",
      tags: ["Assignments"],
    })
    .input(assignmentIdInput)
    .handler(({ context, input }) =>
      context.services.assignments.getAssignedSubmission(context, input)
    ),
  // Organizer: enumerate the judge pool for the batch-assign picker
  judgePool: protectedProcedure
    .route({
      method: "GET",
      path: "/events/{eventId}/judge-pool",
      summary: "List judges available to assign on this event",
      tags: ["Assignments"],
    })
    .input(eventIdInput)
    .handler(({ context, input }) =>
      context.services.assignments.judgePool(context, input)
    ),

  // Judge: get my assignments
  myAssignments: protectedProcedure
    .route({
      method: "GET",
      path: "/events/{eventId}/assignments/my",
      summary: "Get my judge assignments",
      tags: ["Assignments"],
    })
    .input(eventIdInput)
    .handler(({ context, input }) =>
      context.services.assignments.myAssignments(context, input)
    ),

  // Judge: my progress
  myProgress: protectedProcedure
    .route({
      method: "GET",
      path: "/events/{eventId}/assignments/progress/my",
      summary: "Get my judging progress",
      tags: ["Assignments"],
    })
    .input(eventIdInput)
    .handler(({ context, input }) =>
      context.services.assignments.myProgress(context, input)
    ),

  // Organizer: progress overview (does NOT expose per-judge scores to other judges)
  progress: protectedProcedure
    .route({
      method: "GET",
      path: "/events/{eventId}/assignments/progress",
      summary: "Get judging progress overview",
      tags: ["Assignments"],
    })
    .input(eventIdInput)
    .handler(({ context, input }) =>
      context.services.assignments.progress(context, input)
    ),
};

// ─── Scoring ──────────────────────────────────────────────────────────────────

export const scoringRouter = {
  // Organizer: get all scores for an event (never exposed to judges)
  allScores: protectedProcedure
    .route({
      method: "GET",
      path: "/events/{eventId}/scores",
      summary: "Get all scores for an event",
      tags: ["Scoring"],
    })
    .input(eventIdInput)
    .handler(({ context, input }) =>
      context.services.scoring.allScores(context, input)
    ),

  // Judge: get my own score for an assignment
  getMyScore: protectedProcedure
    .route({
      method: "GET",
      path: "/assignments/{assignmentId}/score",
      summary: "Get my score for an assignment",
      tags: ["Scoring"],
    })
    .input(assignmentIdInput)
    .handler(({ context, input }) =>
      context.services.scoring.getMyScore(context, input)
    ),

  // Organizer: lock scores for an event (prevent further edits)
  lockScores: protectedProcedure
    .route({
      method: "POST",
      path: "/events/{eventId}/scores/lock",
      summary: "Lock scores for an event",
      tags: ["Scoring"],
    })
    .input(eventIdInput)
    .handler(({ context, input }) =>
      context.services.scoring.lockScores(context, input)
    ),

  // Judge: submit score for an assignment
  submit: protectedProcedure
    .route({
      method: "PUT",
      path: "/assignments/{assignmentId}/score",
      summary: "Submit a score for an assignment",
      tags: ["Scoring"],
    })
    .input(submitScoreInput)
    .handler(({ context, input }) =>
      context.services.scoring.submit(context, input)
    ),
};
