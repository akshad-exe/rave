import { protectedProcedure, publicProcedure } from "../index";
import {
  createPrizeInput,
  createTrackInput,
  eventIdInput,
  prizeIdInput,
  trackIdInput,
  updateTrackInput,
} from "../schemas/tracks";

export const tracksRouter = {
  create: protectedProcedure
    .route({
      method: "POST",
      path: "/events/{eventId}/tracks",
      summary: "Create a track",
      tags: ["Tracks"],
    })
    .input(createTrackInput)
    .handler(({ context, input }) =>
      context.services.tracks.create(context, input)
    ),

  delete: protectedProcedure
    .route({
      method: "DELETE",
      path: "/tracks/{trackId}",
      summary: "Delete a track",
      tags: ["Tracks"],
    })
    .input(trackIdInput)
    .handler(({ context, input }) =>
      context.services.tracks.delete(context, input)
    ),

  list: publicProcedure
    .route({
      method: "GET",
      path: "/events/{eventId}/tracks",
      summary: "List tracks for an event",
      tags: ["Tracks"],
    })
    .input(eventIdInput)
    .handler(({ context, input }) =>
      context.services.tracks.list(context, input)
    ),

  update: protectedProcedure
    .route({
      method: "PATCH",
      path: "/tracks/{trackId}",
      summary: "Update a track",
      tags: ["Tracks"],
    })
    .input(updateTrackInput)
    .handler(({ context, input }) =>
      context.services.tracks.update(context, input)
    ),
};

export const prizesRouter = {
  create: protectedProcedure
    .route({
      method: "POST",
      path: "/events/{eventId}/prizes",
      summary: "Create a prize",
      tags: ["Prizes"],
    })
    .input(createPrizeInput)
    .handler(({ context, input }) =>
      context.services.prizes.create(context, input)
    ),

  delete: protectedProcedure
    .route({
      method: "DELETE",
      path: "/prizes/{prizeId}",
      summary: "Delete a prize",
      tags: ["Prizes"],
    })
    .input(prizeIdInput)
    .handler(({ context, input }) =>
      context.services.prizes.delete(context, input)
    ),

  list: publicProcedure
    .route({
      method: "GET",
      path: "/events/{eventId}/prizes",
      summary: "List prizes for an event",
      tags: ["Prizes"],
    })
    .input(eventIdInput)
    .handler(({ context, input }) =>
      context.services.prizes.list(context, input)
    ),
};
