import { badRequest, forbidden } from "@rave/api/errors";
import { event, score, submission, team, track } from "@rave/db";
import { and, asc, eq, isNotNull } from "drizzle-orm";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

import { createContext } from "../../composition/context";
import { services } from "../../composition/services";
import { requireExactRole, requireUserId } from "../../lib/assert";
import { escapeHtml } from "../../lib/html";
import { PORTAL_ROUTES } from "./paths";

/**
 * Resolves the event these portal routes operate on.
 *
 * The platform is multi-event, but a seeded demo portal has exactly one public
 * event, so routes that do not name an event fall back to that one.
 */
async function resolveEventId(
  request: FastifyRequest,
  explicit?: string
): Promise<string> {
  if (explicit) {
    return explicit;
  }

  const ctx = await createContext(request);
  const rows = await ctx.db
    .select({ id: event.id })
    .from(event)
    .where(eq(event.isPublic, true))
    .orderBy(asc(event.createdAt))
    .limit(1);

  const [found] = rows;
  if (!found) {
    throw badRequest("No public event is available");
  }
  return found.id;
}

// ─── Public gallery ──────────────────────────────────────────────────────────

interface GalleryProject {
  name: string;
  repositoryUrl: string | null;
  submittedAt: Date | null;
  summary: string | null;
  teamName: string | null;
  trackName: string | null;
}

function renderGallery(
  heading: string,
  tagline: string | null,
  projects: GalleryProject[]
): string {
  const cards = projects
    .map((project) => {
      const repo = project.repositoryUrl
        ? `<p class="repo"><a href="${escapeHtml(project.repositoryUrl)}" rel="noopener noreferrer">Repository</a></p>`
        : "";
      return `      <li class="project">
        <h2>${escapeHtml(project.name)}</h2>
        <p class="meta">${escapeHtml(project.teamName ?? "Independent")} &middot; ${escapeHtml(project.trackName ?? "General")}</p>
        <p class="summary">${escapeHtml(project.summary ?? "")}</p>
${repo}
      </li>`;
    })
    .join("\n");

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(heading)} &middot; Gallery</title>
    <style>
      body { font-family: system-ui, sans-serif; margin: 0 auto; max-width: 60rem; padding: 2rem 1rem; line-height: 1.5; }
      h1 { margin-bottom: 0.25rem; }
      .tagline { color: #555; margin-top: 0; }
      .projects { display: grid; gap: 1rem; list-style: none; padding: 0; }
      .project { border: 1px solid #ddd; border-radius: 0.5rem; padding: 1rem; }
      .project h2 { margin: 0 0 0.25rem; font-size: 1.1rem; }
      .meta { color: #666; font-size: 0.875rem; margin: 0 0 0.5rem; }
      .summary { margin: 0; }
      .repo { margin: 0.5rem 0 0; font-size: 0.875rem; }
    </style>
  </head>
  <body>
    <h1>${escapeHtml(heading)}</h1>
    <p class="tagline">${escapeHtml(tagline ?? "")}</p>
    <p>${projects.length} project${projects.length === 1 ? "" : "s"}</p>
    <ul class="projects">
${cards}
    </ul>
  </body>
</html>
`;
}

async function getGallery(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const ctx = await createContext(request);
  const eventId = await resolveEventId(request);

  const [details] = await ctx.db
    .select({ name: event.name, tagline: event.tagline })
    .from(event)
    .where(eq(event.id, eventId));

  // Only projects that were actually submitted belong in a public gallery, so
  // drafts are excluded even though they are stored in the same table.
  const projects = await ctx.db
    .select({
      name: submission.name,
      repositoryUrl: submission.repositoryUrl,
      submittedAt: submission.submittedAt,
      summary: submission.tagline,
      teamName: team.name,
      trackName: track.name,
    })
    .from(submission)
    .leftJoin(team, eq(submission.teamId, team.id))
    .leftJoin(track, eq(submission.trackId, track.id))
    .where(
      and(eq(submission.eventId, eventId), isNotNull(submission.submittedAt))
    )
    .orderBy(asc(submission.name));

  reply
    .header("content-type", "text/html; charset=utf-8")
    .status(200)
    .send(
      renderGallery(
        details?.name ?? "Hackathon",
        details?.tagline ?? null,
        projects
      )
    );
}

// ─── Submission ──────────────────────────────────────────────────────────────

interface SubmitBody {
  eventId?: string;
  name?: string;
  summary?: string;
  tagline?: string;
  teamId?: string;
  title?: string;
}

/**
 * Creates a submission.
 *
 * The body accepts the friendly `title`/`summary` spelling as well as the
 * database's `name`/`tagline`. All deadline and membership rules come from the
 * submissions service, so this route cannot drift from the oRPC surface.
 */
async function postSubmission(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const ctx = await createContext(request);
  requireUserId(ctx);

  const body = (request.body ?? {}) as SubmitBody;
  const name = (body.name ?? body.title ?? "").trim();
  if (name.length === 0) {
    throw badRequest("A project title is required");
  }

  const eventId = await resolveEventId(request, body.eventId);
  const created = await services.submissions.create(ctx, {
    customAnswers: [],
    eventId,
    galleryImageUrls: [],
    name,
    tagline: (body.tagline ?? body.summary ?? "").trim() || undefined,
    teamId: body.teamId,
    techTags: [],
  });

  reply.status(201).send(created);
}

// ─── Judge scores ────────────────────────────────────────────────────────────

/**
 * Returns the caller's own scores, and only their own.
 *
 * `?judge=<id>` names the judge whose scores are wanted. Anyone asking for a
 * different judge is refused, which is the judge-isolation guarantee: a judge
 * can never read a peer's scoring.
 */
async function getJudgeScores(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const ctx = await createContext(request);
  const judgeId = await requireExactRole(ctx, "judge");

  const query = request.query as { judge?: string };
  if (query.judge && query.judge !== judgeId) {
    // 403 rather than 404: the caller is a judge and is not the judge being
    // asked about. Confirming the route exists helps no one here, and this
    // response must not carry anything from the other judge's work.
    throw forbidden(
      "Not your scores. Judges may only read the scores they submitted."
    );
  }

  const rows = await ctx.db
    .select({
      assignmentId: score.assignmentId,
      criteria: score.criterionScores,
      feedback: score.feedback,
      isLocked: score.isLocked,
      judgeId: score.judgeId,
      projectId: score.submissionId,
      projectName: submission.name,
      submittedAt: score.submittedAt,
      totalScore: score.totalScore,
    })
    .from(score)
    .innerJoin(submission, eq(score.submissionId, submission.id))
    .where(eq(score.judgeId, judgeId))
    .orderBy(asc(submission.name));

  reply.status(200).send({ count: rows.length, judgeId, scores: rows });
}

// ─── Organizer CSV export ────────────────────────────────────────────────────

async function getScoresCsv(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const ctx = await createContext(request);
  const eventId = await resolveEventId(request);
  const { csv } = await services.exports.rawScores(ctx, { eventId });

  reply
    .header("content-type", "text/csv; charset=utf-8")
    .header(
      "content-disposition",
      `attachment; filename="${eventId}-scores.csv"`
    )
    .status(200)
    .send(csv);
}

export function registerPortalRoutes(fastify: FastifyInstance): void {
  fastify.get(PORTAL_ROUTES.gallery, getGallery);
  fastify.post(PORTAL_ROUTES.submit, postSubmission);
  fastify.get(PORTAL_ROUTES.judgeScores, getJudgeScores);
  fastify.get(PORTAL_ROUTES.csvExport, getScoresCsv);
}
