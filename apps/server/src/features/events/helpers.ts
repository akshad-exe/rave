// ─── Shared event helpers ─────────────────────────────────────────────────────

const PLAIN_UPDATE_FIELDS = [
  "allowIndividuals",
  "coverImageUrl",
  "customQuestions",
  "description",
  "isPublic",
  "maxTeamSize",
  "maxVotesPerUser",
  "minTeamSize",
  "name",
  "tagline",
  "votingMode",
  "websiteUrl",
] as const;

const DATE_UPDATE_FIELDS = [
  "endDate",
  "judgingEndAt",
  "judgingStartAt",
  "registrationEndAt",
  "registrationStartAt",
  "startDate",
  "submissionDeadline",
  "submissionStartAt",
] as const;

/**
 * Collects defined event fields into a DB update map, coercing ISO dates.
 * `slug` is handled by the caller because it needs a uniqueness check.
 */
export function collectEventUpdates(
  fields: Record<string, unknown>
): Record<string, unknown> {
  const updates: Record<string, unknown> = {};
  for (const key of PLAIN_UPDATE_FIELDS) {
    const value = fields[key];
    if (value !== undefined) {
      updates[key] = value;
    }
  }
  for (const key of DATE_UPDATE_FIELDS) {
    const value = fields[key];
    if (value !== undefined) {
      updates[key] = new Date(value as string);
    }
  }
  return updates;
}

export const VALID_STATUS_TRANSITIONS: Record<string, string[]> = {
  archived: [],
  draft: ["registration", "submission"],
  judging: ["results", "submission"],
  registration: ["submission", "draft"],
  results: ["archived", "judging"],
  submission: ["judging", "registration"],
};
