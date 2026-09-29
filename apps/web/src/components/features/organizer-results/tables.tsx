import { Badge } from "@rave/ui/components/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@rave/ui/components/card";
import { Skeleton } from "@rave/ui/components/skeleton";
import {
  type AdminResult,
  fmt,
  type PublishedResult,
  type Track,
  trackName,
} from "./shared";

/**
 * The organizer's view of results, and a preview of the public one.
 *
 * Raw and normalized scores are shown side by side because JUDGING.md works
 * through why they differ, and an organizer who sees only the final number has
 * no way to sanity-check a judge's generosity. The public preview exists so
 * "reveal" is not a leap of faith.
 */

function ResultsSkeleton() {
  return (
    <Card variant="default">
      <CardHeader>
        <Skeleton className="h-5 w-44" />
      </CardHeader>
      <CardContent className="space-y-3">
        {(["a", "b", "c", "d"] as const).map((k) => (
          <Skeleton className="h-11 w-full" key={k} />
        ))}
      </CardContent>
    </Card>
  );
}

export function AdminResultsPanel({
  results,
  tracks,
  status,
}: {
  results: AdminResult[];
  status: "error" | "pending" | "success";
  tracks: Track[] | undefined;
}) {
  if (status === "pending") {
    return <ResultsSkeleton />;
  }

  if (results.length === 0) {
    return (
      <Card variant="default">
        <CardHeader>
          <CardTitle>Computed results</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="py-4 text-center text-muted-foreground text-sm">
            No results stored yet. Compute them above once judging is done.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card variant="default">
      <CardHeader>
        <CardTitle>Computed results</CardTitle>
        <CardDescription>
          Organizer view, including the raw and normalized scores judges cannot
          see.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-border border-b text-left text-muted-foreground text-xs">
                <th className="pb-2 font-medium" scope="col">
                  Rank
                </th>
                <th className="pb-2 font-medium" scope="col">
                  Project
                </th>
                <th className="pb-2 font-medium" scope="col">
                  Track
                </th>
                <th className="pb-2 text-right font-medium" scope="col">
                  Raw
                </th>
                <th className="pb-2 text-right font-medium" scope="col">
                  Normalized
                </th>
                <th className="pb-2 text-right font-medium" scope="col">
                  Final
                </th>
              </tr>
            </thead>
            <tbody>
              {results.map((row) => (
                <AdminResultRow key={row.id} row={row} tracks={tracks} />
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

function AdminResultRow({
  row,
  tracks,
}: {
  row: AdminResult;
  tracks: Track[] | undefined;
}) {
  return (
    <tr className="border-border/60 border-b last:border-0">
      <td className="py-2.5 pr-3 font-medium tabular-nums">
        {row.rank ?? "—"}
      </td>
      <td className="py-2.5 pr-3 font-mono text-xs">
        {row.submissionId.slice(0, 10)}
      </td>
      <td className="py-2.5 pr-3 text-muted-foreground text-xs">
        {trackName(tracks, row.trackId)}
      </td>
      <td className="py-2.5 text-right text-muted-foreground tabular-nums">
        {fmt(row.rawScore)}
      </td>
      <td className="py-2.5 text-right text-muted-foreground tabular-nums">
        {fmt(row.normalizedScore)}
      </td>
      <td className="py-2.5 text-right font-medium tabular-nums">
        {fmt(row.finalScore)}
      </td>
    </tr>
  );
}

// ─── Public preview ───────────────────────────────────────────────────────────

export function PublicPreviewPanel({
  results,
  status,
}: {
  results: PublishedResult[];
  status: "error" | "pending" | "success";
}) {
  if (status === "pending") {
    return <ResultsSkeleton />;
  }

  return (
    <Card variant="default">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle>Public preview</CardTitle>
            <CardDescription>
              Exactly what participants see once results are published.
            </CardDescription>
          </div>
          <Badge variant="outline">{results.length} shown</Badge>
        </div>
      </CardHeader>
      <CardContent>
        {results.length === 0 ? (
          <p className="py-4 text-center text-muted-foreground text-sm">
            Nothing to preview yet. Publish results to populate this view.
          </p>
        ) : (
          <ol className="space-y-2">
            {results.map((row) => (
              <li
                className="flex items-center justify-between gap-4 rounded-lg border border-border px-3.5 py-2.5"
                key={row.id}
              >
                <span className="flex items-center gap-3">
                  <Badge variant={row.rank === 1 ? "default" : "subtle"}>
                    #{row.rank ?? "—"}
                  </Badge>
                  <span className="font-mono text-xs">
                    {row.submissionId.slice(0, 10)}
                  </span>
                </span>
                <span className="text-xs">
                  {row.scoreBreakdown
                    ? `${Object.keys(row.scoreBreakdown).length} criteria`
                    : "—"}
                </span>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Confirm dialog ───────────────────────────────────────────────────────────

// ─── Skeleton ─────────────────────────────────────────────────────────────────
