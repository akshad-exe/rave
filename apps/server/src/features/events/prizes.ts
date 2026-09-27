import type { PrizesService } from "@rave/api/contract";
import { notFound } from "@rave/api/errors";
import { generateId } from "@rave/api/id";
import { prize } from "@rave/db";
import { eq } from "drizzle-orm";

import { assertEventOrganizer, requireRow } from "../../lib/assert";

export const prizesService: PrizesService = {
  async create(ctx, input) {
    await assertEventOrganizer(ctx, input.eventId);

    const id = generateId("prz");
    await ctx.db.insert(prize).values({
      currency: input.currency,
      description: input.description,
      eventId: input.eventId,
      id,
      name: input.name,
      sortOrder: input.sortOrder,
      trackId: input.trackId,
      value: input.value,
    });

    const rows = await ctx.db.select().from(prize).where(eq(prize.id, id));
    return requireRow(rows, "Prize not found");
  },

  async delete(ctx, input) {
    const rows = await ctx.db
      .select({ eventId: prize.eventId })
      .from(prize)
      .where(eq(prize.id, input.prizeId));

    const [p] = rows;
    if (!p) {
      throw notFound("Prize not found");
    }

    await assertEventOrganizer(ctx, p.eventId);
    await ctx.db.delete(prize).where(eq(prize.id, input.prizeId));
    return { ok: true };
  },

  list(ctx, input) {
    return ctx.db
      .select()
      .from(prize)
      .where(eq(prize.eventId, input.eventId))
      .orderBy(prize.sortOrder);
  },
};
