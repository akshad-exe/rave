import type { client } from "@/utils/orpc";

export type AdminResult = Awaited<
  ReturnType<typeof client.results.getAdmin>
>[number];
export type PublishedResult = Awaited<
  ReturnType<typeof client.results.getPublished>
>["results"][number];
export type RubricRow = Awaited<
  ReturnType<typeof client.rubrics.listByEvent>
>[number];
export type Track = Awaited<ReturnType<typeof client.tracks.list>>[number];

export const ALL_TRACKS = "__all__";

export function trackName(
  tracks: Track[] | undefined,
  trackId: string | null
): string {
  if (!trackId) {
    return "Untracked";
  }
  return tracks?.find((t) => t.id === trackId)?.name ?? "Unknown track";
}

export function fmt(value: string | null, digits = 2): string {
  if (value === null) {
    return "—";
  }
  const n = Number(value);
  return Number.isNaN(n) ? "—" : n.toFixed(digits);
}
