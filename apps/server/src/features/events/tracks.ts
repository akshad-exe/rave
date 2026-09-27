import { writeAudit } from "@rave/api/audit";
import type { TracksService } from "@rave/api/contract";
import { notFound } from "@rave/api/errors";
import { generateId } from "@rave/api/id";
import { track } from "@rave/db";
import { eq } from "drizzle-orm";

import { assertEventOrganizer, requireRow } from "../../lib/assert";

export const tracksService: TracksService = {
  async create(ctx, input) {
    await assertEventOrganizer(ctx, input.eventId);

    const id = generateId("trk");
    await ctx.db.insert(track).values({
      description: input.description,
      eventId: input.eventId,
      id,
      maxSubmissions: input.maxSubmissions,
      name: input.name,
      sortOrder: input.sortOrder,
    });

    await writeAudit(ctx, {
      action: "track.create",
      eventId: input.eventId,
      metadata: { name: input.name },
      resourceId: id,
      resourceType: "track",
    });

    const rows = await ctx.db.select().from(track).where(eq(track.id, id));
    return requireRow(rows, "Track not found");
  },

  async delete(ctx, input) {
    const rows = await ctx.db
      .select({ eventId: track.eventId })
      .from(track)
      .where(eq(track.id, input.trackId));

    const [t] = rows;
    if (!t) {
      throw notFound("Track not found");
    }

    await assertEventOrganizer(ctx, t.eventId);

    await ctx.db.delete(track).where(eq(track.id, input.trackId));

    await writeAudit(ctx, {
      action: "track.delete",
      eventId: t.eventId,
      resourceId: input.trackId,
      resourceType: "track",
    });

    return { ok: true };
  },

  list(ctx, input) {
    return ctx.db
      .select()
      .from(track)
      .where(eq(track.eventId, input.eventId))
      .orderBy(track.sortOrder);
  },

  async update(ctx, input) {
    const { trackId, ...fields } = input;
    const rows = await ctx.db
      .select({ eventId: track.eventId })
      .from(track)
      .where(eq(track.id, trackId));

    const [t] = rows;
    if (!t) {
      throw notFound("Track not found");
    }

    await assertEventOrganizer(ctx, t.eventId);

    await ctx.db
      .update(track)
      .set({ ...fields })
      .where(eq(track.id, trackId));

    const updated = await ctx.db
      .select()
      .from(track)
      .where(eq(track.id, trackId));
    return requireRow(updated, "Track not found");
  },
};
