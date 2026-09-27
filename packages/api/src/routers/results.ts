import { protectedProcedure, publicProcedure } from "../index";
import {
  adminResultsInput,
  computeResultsInput,
  publishedResultsInput,
} from "../schemas/results";

export const resultsRouter = {
  // Organizer: compute and store results
  compute: protectedProcedure
    .route({
      method: "POST",
      path: "/events/{eventId}/results/compute",
      summary: "Compute and store results for an event",
      tags: ["Results"],
    })
    .input(computeResultsInput)
    .handler(({ context, input }) =>
      context.services.results.compute(context, input)
    ),

  // Organizer: get full results (including raw/normalized scores)
  getAdmin: protectedProcedure
    .route({
      method: "GET",
      path: "/events/{eventId}/results/admin",
      summary: "Get full results for an event",
      tags: ["Results"],
    })
    .input(adminResultsInput)
    .handler(({ context, input }) =>
      context.services.results.getAdmin(context, input)
    ),

  // Public: get published results (respects visibility flag)
  getPublished: publicProcedure
    .route({
      method: "GET",
      path: "/events/{eventId}/results",
      summary: "Get published results for an event",
      tags: ["Results"],
    })
    .input(publishedResultsInput)
    .handler(({ context, input }) =>
      context.services.results.getPublished(context, input)
    ),
};
