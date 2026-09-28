import { writeAudit } from "@rave/api/audit";
import type { SubmissionsService } from "@rave/api/contract";
import { badRequest, forbidden, notFound } from "@rave/api/errors";
import { generateId } from "@rave/api/id";
import { ballotSeed, event, submission, team, teamMember } from "@rave/db";
import { and, eq, ilike, inArray, or, type SQL, sql } from "drizzle-orm";

import {
  assertEventOrganizer,
  requireRow,
  requireUserId,
} from "../../lib/assert";
import { assertSubmissionOpen, assertSubmissionOwner } from "./helpers";

// Deterministic shuffle using Fisher-Yates algorithm with a seeded random number generator
function deterministicShuffle<T>(array: T[], seed: number): T[] {
  const result = [...array];
  let randomSeed = seed;

  // Simple linear congruential generator for deterministic randomness
  function nextRandom(): number {
    randomSeed = (randomSeed * 1_664_525 + 1_013_904_223) % 4_294_967_296;
    return randomSeed / 4_294_967_296;
  }

  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(nextRandom() * (i + 1));
    const temp = result[i];
    result[i] = result[j] as T;
    result[j] = temp as T;
  }

  return result;
}

export const submissionsService: SubmissionsService = {
  // Create draft submission
  async create(ctx, input) {
    const userId = requireUserId(ctx);
    await assertSubmissionOpen(ctx, input.eventId);

    // If teamId provided, verify user is a member
    if (input.teamId) {
      const mRows = await ctx.db
        .select({ userId: teamMember.userId })
        .from(teamMember)
        .where(
          and(
            eq(teamMember.teamId, input.teamId),
            eq(teamMember.userId, userId)
          )
        );
      if (!mRows.length) {
        throw forbidden("Not a member of this team");
      }

      // Check team belongs to this event
      const tRows = await ctx.db
        .select({ eventId: team.eventId })
        .from(team)
        .where(eq(team.id, input.teamId));
      if (tRows[0]?.eventId !== input.eventId) {
        throw badRequest("Team does not belong to this event");
      }

      // Check team doesn't already have a submission
      const existing = await ctx.db
        .select({ id: submission.id })
        .from(submission)
        .where(
          and(
            eq(submission.teamId, input.teamId),
            eq(submission.eventId, input.eventId)
          )
        );
      if (existing.length) {
        throw badRequest("Team already has a submission");
      }
    } else {
      // Solo submission: check user doesn't already have one
      const existing = await ctx.db
        .select({ id: submission.id })
        .from(submission)
        .where(
          and(
            eq(submission.submitterId, userId),
            eq(submission.eventId, input.eventId),
            sql`${submission.teamId} IS NULL`
          )
        );
      if (existing.length) {
        throw badRequest("Already have a submission for this event");
      }
    }

    const id = generateId("sub");
    await ctx.db.insert(submission).values({
      customAnswers: input.customAnswers,
      demoVideoUrl: input.demoVideoUrl,
      description: input.description,
      eventId: input.eventId,
      galleryImageUrls: input.galleryImageUrls,
      id,
      liveDemoUrl: input.liveDemoUrl,
      name: input.name,
      repositoryUrl: input.repositoryUrl,
      status: "draft",
      submitterId: userId,
      tagline: input.tagline,
      teamId: input.teamId,
      techTags: input.techTags,
      thumbnailUrl: input.thumbnailUrl,
      trackId: input.trackId,
    });

    await writeAudit(ctx, {
      action: "submission.create",
      eventId: input.eventId,
      metadata: { name: input.name },
      resourceId: id,
      resourceType: "submission",
    });

    const rows = await ctx.db
      .select()
      .from(submission)
      .where(eq(submission.id, id));
    return requireRow(rows, "Submission not found");
  },

  // Organizer: disqualify a submission
  async disqualify(ctx, input) {
    const rows = await ctx.db
      .select({
        eventId: submission.eventId,
        status: submission.status,
      })
      .from(submission)
      .where(eq(submission.id, input.submissionId));

    const [sub] = rows;
    if (!sub) {
      throw notFound("Submission not found");
    }

    await assertEventOrganizer(ctx, sub.eventId);

    await ctx.db
      .update(submission)
      .set({ status: "disqualified", updatedAt: new Date() })
      .where(eq(submission.id, input.submissionId));

    await writeAudit(ctx, {
      action: "submission.disqualify",
      eventId: sub.eventId,
      metadata: { reason: input.reason },
      resourceId: input.submissionId,
      resourceType: "submission",
    });

    return { ok: true };
  },

  // Public gallery: only submitted + non-disqualified
  async gallery(ctx, input) {
    // Verify event is public
    const evRows = await ctx.db
      .select({
        isPublic: event.isPublic,
        status: event.status,
      })
      .from(event)
      .where(eq(event.id, input.eventId));

    const [ev] = evRows;
    if (!ev) {
      throw notFound("Event not found");
    }
    if (!(ev.isPublic || ctx.session?.user)) {
      throw forbidden("Event is private");
    }

    const conditions = [
      eq(submission.eventId, input.eventId),
      eq(submission.status, "submitted"),
    ];

    if (input.trackId) {
      conditions.push(eq(submission.trackId, input.trackId));
    }

    if (input.search) {
      conditions.push(
        or(
          ilike(submission.name, `%${input.search}%`),
          ilike(submission.tagline, `%${input.search}%`)
        ) as ReturnType<typeof eq>
      );
    }

    const offset = (input.page - 1) * input.limit;

    // Fetch all matching submissions first (for random sort we need all)
    const allRows = await ctx.db
      .select({
        demoVideoUrl: submission.demoVideoUrl,
        id: submission.id,
        liveDemoUrl: submission.liveDemoUrl,
        name: submission.name,
        repositoryUrl: submission.repositoryUrl,
        submittedAt: submission.submittedAt,
        submitterId: submission.submitterId,
        tagline: submission.tagline,
        teamId: submission.teamId,
        techTags: submission.techTags,
        thumbnailUrl: submission.thumbnailUrl,
        trackId: submission.trackId,
      })
      .from(submission)
      .where(and(...conditions));

    // Handle sorting
    let sortedRows = allRows;
    if (input.sortBy === "name") {
      sortedRows = allRows.sort((a, b) => a.name.localeCompare(b.name));
    } else if (input.sortBy === "random") {
      // Get or create ballot seed for this user/event
      const userId = ctx.session?.user?.id;
      let seed = 0;
      if (userId) {
        const seedRows = await ctx.db
          .select({ seed: ballotSeed.seed })
          .from(ballotSeed)
          .where(
            and(
              eq(ballotSeed.userId, userId),
              eq(ballotSeed.eventId, input.eventId)
            )
          )
          .limit(1);

        if (seedRows.length > 0) {
          const [seedRow] = seedRows;
          if (seedRow) {
            ({ seed } = seedRow);
          }
        } else {
          // Generate new seed
          seed = Math.floor(Math.random() * 2_147_483_647);
          await ctx.db.insert(ballotSeed).values({
            eventId: input.eventId,
            id: generateId("bld"),
            seed,
            userId,
          });
        }
      } else {
        // For anonymous users, use a session-based seed or event-based seed
        seed = Math.floor(Math.random() * 2_147_483_647);
      }

      // Deterministic shuffle using Fisher-Yates with seeded random
      sortedRows = deterministicShuffle(allRows, seed);
    } else {
      // Default: recent (by submittedAt desc)
      sortedRows = allRows.sort(
        (a, b) =>
          new Date(b.submittedAt ?? 0).getTime() -
          new Date(a.submittedAt ?? 0).getTime()
      );
    }

    // Apply pagination
    const rows = sortedRows.slice(offset, offset + input.limit);

    return { limit: input.limit, page: input.page, submissions: rows };
  },

  // Get single submission (public if event is public)
  async get(ctx, input) {
    const rows = await ctx.db
      .select()
      .from(submission)
      .where(eq(submission.id, input.submissionId));

    const [sub] = rows;
    if (!sub) {
      throw notFound("Submission not found");
    }

    // Check event visibility
    const evRows = await ctx.db
      .select({ isPublic: event.isPublic })
      .from(event)
      .where(eq(event.id, sub.eventId));

    const [ev] = evRows;
    if (!(ev?.isPublic || ctx.session?.user)) {
      throw forbidden("Event is private");
    }

    // Only expose public fields for non-owners
    if (sub.status === "draft") {
      const userId = ctx.session?.user?.id;
      if (!userId) {
        throw forbidden("Submission is a draft");
      }

      // Must be owner or team member
      const isOwner = sub.submitterId === userId;
      let isTeamMember = false;
      if (sub.teamId) {
        const mRows = await ctx.db
          .select({ userId: teamMember.userId })
          .from(teamMember)
          .where(
            and(
              eq(teamMember.teamId, sub.teamId),
              eq(teamMember.userId, userId)
            )
          );
        isTeamMember = mRows.length > 0;
      }

      if (!(isOwner || isTeamMember)) {
        throw forbidden("Cannot access draft submission");
      }
    }

    return sub;
  },

  // My submissions
  async mySubmissions(ctx, input) {
    const userId = requireUserId(ctx);

    // Find teams the user is in
    const teamRows = await ctx.db
      .select({ teamId: teamMember.teamId })
      .from(teamMember)
      .where(eq(teamMember.userId, userId));
    const teamIds = teamRows.map((r) => r.teamId);

    const conditions: SQL<unknown>[] = [];
    if (input.eventId) {
      conditions.push(eq(submission.eventId, input.eventId));
    }

    const orConditions: SQL<unknown>[] = [eq(submission.submitterId, userId)];
    if (teamIds.length) {
      orConditions.push(inArray(submission.teamId, teamIds));
    }

    const orCondition = or(...orConditions);
    if (orCondition) {
      conditions.push(orCondition);
    }

    return ctx.db
      .select()
      .from(submission)
      .where(and(...conditions))
      .orderBy(submission.createdAt);
  },

  // Submit (draft → submitted) — enforces deadline
  async submit(ctx, input) {
    const sub = await assertSubmissionOwner(ctx, input.submissionId);

    if (sub.status !== "draft") {
      throw badRequest(`Cannot submit from status: ${sub.status}`);
    }

    // Hard deadline check — uses server clock
    await assertSubmissionOpen(ctx, sub.eventId);

    // Validate required fields
    const rows = await ctx.db
      .select({ description: submission.description, name: submission.name })
      .from(submission)
      .where(eq(submission.id, input.submissionId));

    const [s] = rows;
    if (!s?.name) {
      throw badRequest("Submission must have a name");
    }

    await ctx.db
      .update(submission)
      .set({
        status: "submitted",
        submittedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(submission.id, input.submissionId));

    await writeAudit(ctx, {
      action: "submission.submit",
      eventId: sub.eventId,
      resourceId: input.submissionId,
      resourceType: "submission",
    });

    const updated = await ctx.db
      .select()
      .from(submission)
      .where(eq(submission.id, input.submissionId));
    return requireRow(updated, "Submission not found");
  },

  // Update draft submission
  async update(ctx, input) {
    const { submissionId, ...fields } = input;
    const sub = await assertSubmissionOwner(ctx, submissionId);

    if (sub.status === "locked") {
      throw badRequest("Submission is locked and cannot be edited");
    }
    if (sub.status === "disqualified") {
      throw badRequest("Submission is disqualified");
    }

    // If still a draft (not yet submitted), deadline check is advisory
    // If submitted, enforce deadline
    if (sub.status === "submitted") {
      await assertSubmissionOpen(ctx, sub.eventId);
    }

    const updates: Record<string, unknown> = { updatedAt: new Date() };
    for (const [k, v] of Object.entries(fields)) {
      if (v !== undefined) {
        updates[k] = v;
      }
    }

    await ctx.db
      .update(submission)
      .set(updates)
      .where(eq(submission.id, submissionId));

    const rows = await ctx.db
      .select()
      .from(submission)
      .where(eq(submission.id, submissionId));
    return requireRow(rows, "Submission not found");
  },
};
