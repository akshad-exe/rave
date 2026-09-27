import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { z } from "zod";

/**
 * Shape of `docs/dogfood/fixtures.json`, the shared DOGFOOD 2026 fixture.
 *
 * Every team seeds the same data from this file so that portals can be
 * compared side by side. The file is treated as read-only input: it is
 * validated, never rewritten.
 */
export const fixturesSchema = z.object({
  event: z.object({
    id: z.string().min(1),
    name: z.string().min(1),
    submissions_close: z.iso.datetime(),
  }),
  judges: z.array(
    z.object({
      email: z.email(),
      id: z.string().min(1),
      name: z.string().min(1),
      tracks: z.array(z.string().min(1)),
    })
  ),
  projects: z.array(
    z.object({
      id: z.string().min(1),
      repo_url: z.url(),
      submitted_at: z.iso.datetime(),
      summary: z.string(),
      team: z.string().min(1),
      title: z.string().min(1),
      track: z.string().min(1),
    })
  ),
  scores: z.array(
    z.object({
      comment: z.string(),
      criteria: z.object({
        functionality: z.number(),
        innovation: z.number(),
        quality: z.number(),
      }),
      judge: z.string().min(1),
      project: z.string().min(1),
    })
  ),
  teams: z.array(
    z.object({
      id: z.string().min(1),
      members: z.array(z.email()),
      name: z.string().min(1),
    })
  ),
  tracks: z.array(z.object({ id: z.string().min(1), name: z.string().min(1) })),
});

export type Fixtures = z.infer<typeof fixturesSchema>;

/** The three scored criteria, in the order they appear on the scoring form. */
export const CRITERION_WEIGHTS = {
  functionality: 40,
  innovation: 30,
  quality: 30,
} as const;

export type CriterionName = keyof typeof CRITERION_WEIGHTS;

const FIXTURES_RELATIVE_PATH = "docs/dogfood/fixtures.json";

/**
 * Locates `fixtures.json`.
 *
 * The server bundles its own sources into `apps/server/dist`, so the fixture
 * cannot be resolved relative to this module. Resolve from the workspace
 * layout instead: the repository root when running locally, and the
 * still-present `/app` tree inside the runtime image.
 */
function resolveFixturesPath(): string {
  const candidates = [
    process.env.FIXTURES_PATH,
    join(process.cwd(), "..", "..", FIXTURES_RELATIVE_PATH),
    join(process.cwd(), FIXTURES_RELATIVE_PATH),
    join("/app", FIXTURES_RELATIVE_PATH),
  ].filter((candidate): candidate is string => Boolean(candidate));

  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }

  throw new Error(
    `Could not find ${FIXTURES_RELATIVE_PATH}. Looked in: ${candidates.join(", ")}. ` +
      "Set FIXTURES_PATH to override."
  );
}

export function loadFixtures(): { fixtures: Fixtures; path: string } {
  const path = resolveFixturesPath();
  const parsed = fixturesSchema.safeParse(
    JSON.parse(readFileSync(path, "utf8"))
  );

  if (!parsed.success) {
    throw new Error(
      `Fixture file ${path} does not match the expected shape: ${z.prettifyError(parsed.error)}`
    );
  }

  return { fixtures: parsed.data, path };
}
