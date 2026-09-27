import type { RouterClient } from "@orpc/server";

import { protectedProcedure, publicProcedure } from "../index";
import { adminRouter } from "./admin";
import { eventsRouter } from "./events";
import { exportsRouter } from "./exports";
import { assignmentsRouter, rubricRouter, scoringRouter } from "./judging";
import { resultsRouter } from "./results";
import { submissionsRouter } from "./submissions";
import { teamsRouter } from "./teams";
import { prizesRouter, tracksRouter } from "./tracks";
import { commentsRouter, votingRouter } from "./voting";

export const appRouter = {
  admin: adminRouter,
  assignments: assignmentsRouter,
  comments: commentsRouter,

  // Domain routers
  events: eventsRouter,
  exports: exportsRouter,
  // Health / meta
  healthCheck: publicProcedure
    .route({
      method: "GET",
      path: "/health",
      summary: "Health check",
      tags: ["Meta"],
    })
    .handler(() => "OK"),
  privateData: protectedProcedure
    .route({
      method: "GET",
      path: "/me",
      summary: "Get the current user's private data",
      tags: ["Meta"],
    })
    .handler(({ context }) => ({
      message: "This is private",
      user: context.session?.user,
    })),
  prizes: prizesRouter,
  results: resultsRouter,
  rubrics: rubricRouter,
  scoring: scoringRouter,
  submissions: submissionsRouter,
  teams: teamsRouter,
  tracks: tracksRouter,
  voting: votingRouter,
};

export type AppRouter = typeof appRouter;
export type AppRouterClient = RouterClient<typeof appRouter>;
