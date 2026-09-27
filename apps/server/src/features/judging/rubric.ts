import { writeAudit } from "@rave/api/audit";
import type { RubricsService } from "@rave/api/contract";
import { badRequest, notFound } from "@rave/api/errors";
import { generateId } from "@rave/api/id";
import { rubric, rubricCriterion } from "@rave/db";
import { eq } from "drizzle-orm";

import { assertEventOrganizer, requireRow } from "../../lib/assert";

export const rubricsService: RubricsService = {
  // Organizer: create a rubric
  async create(ctx, input) {
    await assertEventOrganizer(ctx, input.eventId);

    // Validate weights sum to 100 for weighted rubrics
    if (input.isWeighted) {
      const totalWeight = input.criteria.reduce((sum, c) => sum + c.weight, 0);
      if (Math.abs(totalWeight - 100) > 0.01) {
        throw badRequest(
          `Criterion weights must sum to 100 (got ${totalWeight.toFixed(2)})`
        );
      }
    }

    // Validate score ranges
    for (const c of input.criteria) {
      if (c.minScore >= c.maxScore) {
        throw badRequest(
          `Criterion "${c.name}": minScore must be less than maxScore`
        );
      }
    }

    const rubricId = generateId("rub");
    await ctx.db.insert(rubric).values({
      description: input.description,
      eventId: input.eventId,
      id: rubricId,
      isWeighted: input.isWeighted,
      name: input.name,
      trackId: input.trackId,
    });

    const criterionValues = input.criteria.map((c) => ({
      description: c.description,
      id: generateId("crit"),
      maxScore: c.maxScore,
      minScore: c.minScore,
      name: c.name,
      rubricId,
      sortOrder: c.sortOrder,
      weight: c.weight.toString(),
    }));

    await ctx.db.insert(rubricCriterion).values(criterionValues);

    await writeAudit(ctx, {
      action: "rubric.create",
      eventId: input.eventId,
      metadata: { criteriaCount: input.criteria.length, name: input.name },
      resourceId: rubricId,
      resourceType: "rubric",
    });

    const criteria = await ctx.db
      .select()
      .from(rubricCriterion)
      .where(eq(rubricCriterion.rubricId, rubricId))
      .orderBy(rubricCriterion.sortOrder);

    const rubricRows = await ctx.db
      .select()
      .from(rubric)
      .where(eq(rubric.id, rubricId));

    return { ...requireRow(rubricRows, "Rubric not found"), criteria };
  },

  // Get rubric with criteria
  async get(ctx, input) {
    const rows = await ctx.db
      .select()
      .from(rubric)
      .where(eq(rubric.id, input.rubricId));

    const [r] = rows;
    if (!r) {
      throw notFound("Rubric not found");
    }

    const criteria = await ctx.db
      .select()
      .from(rubricCriterion)
      .where(eq(rubricCriterion.rubricId, input.rubricId))
      .orderBy(rubricCriterion.sortOrder);

    return { ...r, criteria };
  },

  // List rubrics for event
  listByEvent(ctx, input) {
    return ctx.db
      .select()
      .from(rubric)
      .where(eq(rubric.eventId, input.eventId));
  },
};
