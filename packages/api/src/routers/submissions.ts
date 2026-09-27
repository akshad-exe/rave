import { protectedProcedure, publicProcedure } from "../index";
import {
  createSubmissionInput,
  disqualifySubmissionInput,
  galleryInput,
  mySubmissionsInput,
  submissionIdInput,
  updateSubmissionInput,
} from "../schemas/submissions";

export const submissionsRouter = {
  // Create draft submission
  create: protectedProcedure
    .route({
      method: "POST",
      path: "/submissions",
      summary: "Create a draft submission",
      tags: ["Submissions"],
    })
    .input(createSubmissionInput)
    .handler(({ context, input }) =>
      context.services.submissions.create(context, input)
    ),

  // Organizer: disqualify a submission
  disqualify: protectedProcedure
    .route({
      method: "POST",
      path: "/submissions/{submissionId}/disqualify",
      summary: "Disqualify a submission",
      tags: ["Submissions"],
    })
    .input(disqualifySubmissionInput)
    .handler(({ context, input }) =>
      context.services.submissions.disqualify(context, input)
    ),

  // Public gallery: only submitted + non-disqualified
  gallery: publicProcedure
    .route({
      method: "GET",
      path: "/events/{eventId}/submissions",
      summary: "Public gallery of submitted projects",
      tags: ["Submissions"],
    })
    .input(galleryInput)
    .handler(({ context, input }) =>
      context.services.submissions.gallery(context, input)
    ),

  // Get single submission (public if event is public)
  get: publicProcedure
    .route({
      method: "GET",
      path: "/submissions/{submissionId}",
      summary: "Get a single submission",
      tags: ["Submissions"],
    })
    .input(submissionIdInput)
    .handler(({ context, input }) =>
      context.services.submissions.get(context, input)
    ),

  // My submissions
  mySubmissions: protectedProcedure
    .route({
      method: "GET",
      path: "/submissions/my",
      summary: "Get my submissions",
      tags: ["Submissions"],
    })
    .input(mySubmissionsInput)
    .handler(({ context, input }) =>
      context.services.submissions.mySubmissions(context, input)
    ),

  // Submit (draft → submitted) — enforces deadline
  submit: protectedProcedure
    .route({
      method: "POST",
      path: "/submissions/{submissionId}/submit",
      summary: "Submit a draft submission",
      tags: ["Submissions"],
    })
    .input(submissionIdInput)
    .handler(({ context, input }) =>
      context.services.submissions.submit(context, input)
    ),

  // Update draft submission
  update: protectedProcedure
    .route({
      method: "PATCH",
      path: "/submissions/{submissionId}",
      summary: "Update a draft submission",
      tags: ["Submissions"],
    })
    .input(updateSubmissionInput)
    .handler(({ context, input }) =>
      context.services.submissions.update(context, input)
    ),
};
