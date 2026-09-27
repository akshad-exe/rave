import { protectedProcedure } from "../index";
import { eventIdInput } from "../schemas/exports";

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
