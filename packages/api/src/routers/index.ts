import type { RouterClient } from "@orpc/server";

import { protectedProcedure, publicProcedure, resolveRole } from "../index";
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
  /**
   * The signed-in user, plus their role.
   *
   * `role` is stored in a separate `user_profile` table so Better Auth's schema
   * generation stays clean, which means the session user has no role field.
   * Client-side route guards need it, so it is served here.
   */
  me: protectedProcedure
    .route({
      method: "GET",
      path: "/me",
      summary: "Get the signed-in user and their platform role",
      tags: ["Meta"],
    })
    .handler(async ({ context }) => {
      const user = context.session?.user;
      return {
        email: user?.email ?? null,
        id: user?.id ?? null,
        image: user?.image ?? null,
        name: user?.name ?? null,
        role: await resolveRole(context),
      };
    }),
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
