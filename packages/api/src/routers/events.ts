import { z } from "zod";

import { protectedProcedure, publicProcedure, requireRole } from "../index";
import {
  createEventInput,
  eventIdInput,
  listEventsInput,
  transitionEventInput,
  updateEventInput,
} from "../schemas/events";

export const eventsRouter = {
  // Organizer+: create event
  create: protectedProcedure
    .use(requireRole("organizer"))
    .route({
      method: "POST",
      path: "/events",
      summary: "Create an event",
      tags: ["Events"],
    })
    .input(createEventInput)
    .handler(({ context, input }) =>
      context.services.events.create(context, input)
    ),

  // Admin/Organizer: get full event (including private data)
  getAdmin: protectedProcedure
    .route({
      method: "GET",
      path: "/events/{eventId}/admin",
      summary: "Get full event details for admin/organizer",
      tags: ["Events"],
    })
    .input(eventIdInput)
    .handler(({ context, input }) =>
      context.services.events.getAdmin(context, input)
    ),

  // Public: get single event by slug
  getBySlug: publicProcedure
    .route({
      method: "GET",
      path: "/events/{slug}",
      summary: "Get a single event by slug",
      tags: ["Events"],
    })
    .input(z.object({ slug: z.string() }))
    .handler(({ context, input }) =>
      context.services.events.getBySlug(context, input)
    ),

  // Public: list published events
  list: publicProcedure
    .route({
      method: "GET",
      path: "/events",
      summary: "List events",
      tags: ["Events"],
    })
    .input(listEventsInput)
    .handler(({ context, input }) =>
      context.services.events.list(context, input)
    ),

  // Organizer: reveal judging results
  revealResults: protectedProcedure
    .route({
      method: "POST",
      path: "/events/{eventId}/reveal-results",
      summary: "Reveal judging results for an event",
      tags: ["Events"],
    })
    .input(eventIdInput)
    .handler(({ context, input }) =>
      context.services.events.revealResults(context, input)
    ),

  // Organizer: transition event status
  transition: protectedProcedure
    .route({
      method: "POST",
      path: "/events/{eventId}/transition",
      summary: "Transition an event to a new status",
      tags: ["Events"],
    })
    .input(transitionEventInput)
    .handler(({ context, input }) =>
      context.services.events.transition(context, input)
    ),

  // Organizer: update event
  update: protectedProcedure
    .route({
      method: "PATCH",
      path: "/events/{eventId}",
      summary: "Update an event",
      tags: ["Events"],
    })
    .input(updateEventInput)
    .handler(({ context, input }) =>
      context.services.events.update(context, input)
    ),
};
