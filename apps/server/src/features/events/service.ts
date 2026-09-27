import { writeAudit } from "@rave/api/audit";
import type { EventsService } from "@rave/api/contract";
import { badRequest, forbidden, notFound } from "@rave/api/errors";
import { generateId } from "@rave/api/id";
import { event, prize, track } from "@rave/db";
import { and, eq, ilike, or, sql } from "drizzle-orm";

import {
  assertEventOrganizer,
  requireRow,
  requireUserId,
} from "../../lib/assert";
import { collectEventUpdates, VALID_STATUS_TRANSITIONS } from "./helpers";

export const eventsService: EventsService = {
  async create(ctx, input) {
    const userId = requireUserId(ctx);

    // Check slug uniqueness
    const existing = await ctx.db
      .select({ id: event.id })
      .from(event)
      .where(eq(event.slug, input.slug));

    if (existing.length) {
      throw badRequest("Slug already taken");
    }

    const id = generateId("evt");
    await ctx.db.insert(event).values({
      ...input,
      endDate: input.endDate ? new Date(input.endDate) : null,
      id,
      judgingEndAt: input.judgingEndAt ? new Date(input.judgingEndAt) : null,
      judgingStartAt: input.judgingStartAt
        ? new Date(input.judgingStartAt)
        : null,
      organizerId: userId,
      registrationEndAt: input.registrationEndAt
        ? new Date(input.registrationEndAt)
        : null,
      registrationStartAt: input.registrationStartAt
        ? new Date(input.registrationStartAt)
        : null,
      startDate: input.startDate ? new Date(input.startDate) : null,
      submissionDeadline: input.submissionDeadline
        ? new Date(input.submissionDeadline)
        : null,
      submissionStartAt: input.submissionStartAt
        ? new Date(input.submissionStartAt)
        : null,
    });

    await writeAudit(ctx, {
      action: "event.create",
      eventId: id,
      metadata: { name: input.name, slug: input.slug },
      resourceId: id,
      resourceType: "event",
    });

    const rows = await ctx.db.select().from(event).where(eq(event.id, id));
    return requireRow(rows, "Event not found");
  },

  async getAdmin(ctx, input) {
    await assertEventOrganizer(ctx, input.eventId);

    const rows = await ctx.db
      .select()
      .from(event)
      .where(eq(event.id, input.eventId));

    const [ev] = rows;
    if (!ev) {
      throw notFound("Event not found");
    }

    const tracks = await ctx.db
      .select()
      .from(track)
      .where(eq(track.eventId, input.eventId));

    const prizes = await ctx.db
      .select()
      .from(prize)
      .where(eq(prize.eventId, input.eventId));

    return { event: ev, prizes, tracks };
  },

  async getBySlug(ctx, input) {
    const rows = await ctx.db
      .select()
      .from(event)
      .where(eq(event.slug, input.slug));

    const [ev] = rows;
    if (!ev) {
      throw notFound("Event not found");
    }
    if (!(ev.isPublic || ctx.session?.user)) {
      throw forbidden("Event is private");
    }

    // Scrub organizer-only fields if not organizer
    const userId = ctx.session?.user?.id;
    if (ev.organizerId !== userId) {
      return {
        ...ev,
        customQuestions: ev.customQuestions,
        // voting/judging results respect visibility flags
        judgingResultsVisible: ev.judgingResultsVisible,
        votingResultsVisible: ev.votingResultsVisible,
      };
    }
    return ev;
  },

  async list(ctx, input) {
    const { search, status, page, limit } = input;
    const offset = (page - 1) * limit;

    const conditions = [eq(event.isPublic, true)];
    if (status) {
      conditions.push(eq(event.status, status));
    }
    if (search) {
      conditions.push(
        or(
          ilike(event.name, `%${search}%`),
          ilike(event.tagline, `%${search}%`)
        ) as ReturnType<typeof eq>
      );
    }

    const rows = await ctx.db
      .select({
        allowIndividuals: event.allowIndividuals,
        coverImageUrl: event.coverImageUrl,
        endDate: event.endDate,
        id: event.id,
        maxTeamSize: event.maxTeamSize,
        name: event.name,
        slug: event.slug,
        startDate: event.startDate,
        status: event.status,
        submissionDeadline: event.submissionDeadline,
        tagline: event.tagline,
      })
      .from(event)
      .where(and(...conditions))
      .limit(limit)
      .offset(offset)
      .orderBy(event.createdAt);

    return { events: rows, limit, page };
  },

  async revealResults(ctx, input) {
    await assertEventOrganizer(ctx, input.eventId);
    await ctx.db
      .update(event)
      .set({ judgingResultsVisible: true, updatedAt: new Date() })
      .where(eq(event.id, input.eventId));

    await writeAudit(ctx, {
      action: "event.reveal_results",
      eventId: input.eventId,
      resourceId: input.eventId,
      resourceType: "event",
    });
    return { ok: true };
  },

  async transition(ctx, input) {
    await assertEventOrganizer(ctx, input.eventId);

    const rows = await ctx.db
      .select({ status: event.status })
      .from(event)
      .where(eq(event.id, input.eventId));

    const [ev] = rows;
    if (!ev) {
      throw notFound("Event not found");
    }

    const allowed = VALID_STATUS_TRANSITIONS[ev.status] ?? [];
    if (!allowed.includes(input.status)) {
      throw badRequest(
        `Cannot transition from ${ev.status} to ${input.status}`
      );
    }

    const extra: Record<string, unknown> = {};
    if (input.status === "results") {
      extra.resultsPublishedAt = new Date();
    }

    await ctx.db
      .update(event)
      .set({ status: input.status, ...extra, updatedAt: new Date() })
      .where(eq(event.id, input.eventId));

    await writeAudit(ctx, {
      action: "event.transition",
      eventId: input.eventId,
      metadata: { from: ev.status, to: input.status },
      resourceId: input.eventId,
      resourceType: "event",
    });

    return { status: input.status };
  },

  async update(ctx, input) {
    const { eventId, ...fields } = input;
    await assertEventOrganizer(ctx, eventId);

    const updates: Record<string, unknown> = {
      updatedAt: new Date(),
      ...collectEventUpdates(fields),
    };
    if (fields.slug !== undefined) {
      // Check slug uniqueness (excluding this event)
      const existing = await ctx.db
        .select({ id: event.id })
        .from(event)
        .where(
          and(eq(event.slug, fields.slug), sql`${event.id} != ${eventId}`)
        );
      if (existing.length) {
        throw badRequest("Slug already taken");
      }
      updates.slug = fields.slug;
    }

    await ctx.db.update(event).set(updates).where(eq(event.id, eventId));

    await writeAudit(ctx, {
      action: "event.update",
      eventId,
      metadata: { fields: Object.keys(fields) },
      resourceId: eventId,
      resourceType: "event",
    });

    const rows = await ctx.db.select().from(event).where(eq(event.id, eventId));
    return requireRow(rows, "Event not found");
  },
};
