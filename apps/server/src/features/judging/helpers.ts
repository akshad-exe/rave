import type { ServiceContext } from "@rave/api/context";
import { badRequest, forbidden, notFound } from "@rave/api/errors";
import { event, judgeAssignment } from "@rave/db";
import { eq } from "drizzle-orm";

export async function assertJudgingOpen(
  ctx: ServiceContext,
  eventId: string
): Promise<void> {
  const rows = await ctx.db
    .select({
      judgingEndAt: event.judgingEndAt,
      judgingStartAt: event.judgingStartAt,
      status: event.status,
    })
    .from(event)
    .where(eq(event.id, eventId));

  const [ev] = rows;
  if (!ev) {
    throw notFound("Event not found");
  }

  const now = new Date();

  if (ev.status !== "judging") {
    throw badRequest(`Judging is not open (event is in "${ev.status}" phase)`);
  }
  if (ev.judgingStartAt && now < ev.judgingStartAt) {
    throw badRequest("Judging window has not started yet");
  }
  if (ev.judgingEndAt && now > ev.judgingEndAt) {
    throw badRequest("Judging window has ended");
  }
}

export async function getAssignment(
  ctx: ServiceContext,
  assignmentId: string,
  judgeId: string
) {
  const rows = await ctx.db
    .select()
    .from(judgeAssignment)
    .where(eq(judgeAssignment.id, assignmentId));

  const [a] = rows;
  if (!a) {
    throw notFound("Assignment not found");
  }

  // JUDGE ISOLATION: judge can only see their own assignment
  if (a.judgeId !== judgeId) {
    throw forbidden("Not your assignment");
  }
  return a;
}

export interface CriterionInfo {
  id: string;
  maxScore: number;
  minScore: number;
  name: string;
  weight: string;
}

export interface CriterionScoreInput {
  criterionId: string;
  score: number;
}

export function assertCriteriaScoresValid(
  criteriaMap: Map<string, CriterionInfo>,
  criteriaRows: CriterionInfo[],
  criterionScores: CriterionScoreInput[]
): void {
  for (const cs of criterionScores) {
    const criterion = criteriaMap.get(cs.criterionId);
    if (!criterion) {
      throw badRequest(`Unknown criterion: ${cs.criterionId}`);
    }
    if (cs.score < criterion.minScore || cs.score > criterion.maxScore) {
      throw badRequest(
        `Score for "${criterion.name}" must be between ${criterion.minScore} and ${criterion.maxScore}`
      );
    }
  }

  for (const criterion of criteriaRows) {
    const provided = criterionScores.some(
      (cs) => cs.criterionId === criterion.id
    );
    if (!provided) {
      throw badRequest(`Missing score for criterion: ${criterion.name}`);
    }
  }
}

export function computeTotalScore(
  criteriaMap: Map<string, CriterionInfo>,
  criterionScores: CriterionScoreInput[],
  isWeighted: boolean
): number {
  let totalScore = 0;
  for (const cs of criterionScores) {
    const criterion = criteriaMap.get(cs.criterionId);
    if (!criterion) {
      continue;
    }

    const range = criterion.maxScore - criterion.minScore;
    const normalized = range > 0 ? (cs.score - criterion.minScore) / range : 0;

    totalScore += isWeighted ? normalized * Number(criterion.weight) : cs.score;
  }

  return totalScore;
}

export type BatchSkipReason =
  | "own_submission"
  | "own_team"
  | "already_assigned";

export function batchSkipReason(
  judge: string,
  sub: { id: string; submitterId: string; teamId: string | null },
  membersByTeam: Map<string, Set<string>>,
  existingPairs: Set<string>
): BatchSkipReason | null {
  if (sub.submitterId === judge) {
    return "own_submission";
  }
  if (sub.teamId && membersByTeam.get(sub.teamId)?.has(judge)) {
    return "own_team";
  }
  if (existingPairs.has(`${judge}:${sub.id}`)) {
    return "already_assigned";
  }
  return null;
}
