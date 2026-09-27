/**
 * Public, cookie-authenticated HTTP surface.
 *
 * The oRPC API is the typed interface the web app uses, but it speaks RPC
 * framing, which is awkward for anything outside the app: a shareable gallery
 * link, a `curl` for an export, or the DOGFOOD acceptance checker. These
 * routes are thin plain-HTTP wrappers over the same services, so both surfaces
 * enforce identical rules.
 *
 * The values are the single source of truth for route paths. `.dogfood.toml`
 * is generated from them, so the checker and the server can never disagree.
 */
export const PORTAL_ROUTES = {
  csvExport: "/exports/scores.csv",
  gallery: "/gallery",
  judgeScores: "/judging/scores",
  submit: "/submissions",
} as const;

/**
 * The URL that *would* return one judge's scores.
 *
 * The acceptance checker visits it as a different judge and expects a refusal,
 * which is exactly the isolation guarantee T2 is about.
 *
 * @param judgeUserId - User id of the judge whose scores are being requested
 */
export function peerScoresRoute(judgeUserId: string): string {
  return `${PORTAL_ROUTES.judgeScores}?judge=${encodeURIComponent(judgeUserId)}`;
}
