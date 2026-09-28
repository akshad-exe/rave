import { protectedProcedure } from "../index";
import {
  eventIdInput,
  importScoresInput,
  importSubmissionsInput,
} from "../schemas/exports";

export const exportsRouter = {
  // Judge assignments CSV
  assignments: protectedProcedure
    .route({
      method: "GET",
      path: "/events/{eventId}/exports/assignments",
      summary: "Export judge assignments as CSV",
      tags: ["Exports"],
    })
    .input(eventIdInput)
    .handler(({ context, input }) =>
      context.services.exports.assignments(context, input)
    ),

  // Bulk import scores CSV
  importScores: protectedProcedure
    .route({
      method: "POST",
      path: "/events/{eventId}/imports/scores",
      summary: "Bulk import scores from CSV",
      tags: ["Exports"],
    })
    .input(importScoresInput)
    .handler(({ context, input }) =>
      context.services.exports.importScores(context, input)
    ),
  // Bulk import submissions CSV
  importSubmissions: protectedProcedure
    .route({
      method: "POST",
      path: "/events/{eventId}/imports/submissions",
      summary: "Bulk import submissions from CSV",
      tags: ["Exports"],
    })
    .input(importSubmissionsInput)
    .handler(({ context, input }) =>
      context.services.exports.importSubmissions(context, input)
    ),

  // Raw scores CSV
  rawScores: protectedProcedure
    .route({
      method: "GET",
      path: "/events/{eventId}/exports/raw-scores",
      summary: "Export raw scores as CSV",
      tags: ["Exports"],
    })
    .input(eventIdInput)
    .handler(({ context, input }) =>
      context.services.exports.rawScores(context, input)
    ),

  // Results CSV
  results: protectedProcedure
    .route({
      method: "GET",
      path: "/events/{eventId}/exports/results",
      summary: "Export results as CSV",
      tags: ["Exports"],
    })
    .input(eventIdInput)
    .handler(({ context, input }) =>
      context.services.exports.results(context, input)
    ),

  // Submissions CSV
  submissions: protectedProcedure
    .route({
      method: "GET",
      path: "/events/{eventId}/exports/submissions",
      summary: "Export submissions as CSV",
      tags: ["Exports"],
    })
    .input(eventIdInput)
    .handler(({ context, input }) =>
      context.services.exports.submissions(context, input)
    ),

  // Teams CSV
  teams: protectedProcedure
    .route({
      method: "GET",
      path: "/events/{eventId}/exports/teams",
      summary: "Export teams as CSV",
      tags: ["Exports"],
    })
    .input(eventIdInput)
    .handler(({ context, input }) =>
      context.services.exports.teams(context, input)
    ),
};
