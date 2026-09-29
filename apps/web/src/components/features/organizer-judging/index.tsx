import { useQuery } from "@tanstack/react-query";
import { ArrowLeftIcon } from "lucide-react";
import { z } from "zod";
import { orpc } from "@/utils/orpc";
import { BatchAssignPanel } from "./batch-assign";
import { ProgressPanel } from "./progress";
import { ScoresPanel } from "./scores";
import { SingleAssignPanel } from "./single-assign";

/**
 * The organizer judging console: progress, bulk assignment, a single manual
 * assignment, and every score.
 *
 * The panels were one 844-line file. Splitting them keeps each concern
 * readable on its own; the queries stay where they are rather than moving to
 * route loaders, because a loader would make them fire on link hover
 * (`defaultPreload: "intent"`) and fetch progress and scores for an organizer
 * who only opened the page to look at one panel.
 */

export const judgingSearchSchema = z.object({
  panel: z
    .enum(["assign", "progress", "scores", "single"])
    .catch("progress")
    .default("progress"),
});

export type JudgingPanel = z.infer<typeof judgingSearchSchema>["panel"];

export function JudgingConsole({ eventId }: { eventId: string }) {
  const progressQuery = useQuery(
    orpc.assignments.progress.queryOptions({ input: { eventId } })
  );
  const poolQuery = useQuery(
    orpc.assignments.judgePool.queryOptions({ input: { eventId } })
  );
  const scoresQuery = useQuery(
    orpc.scoring.allScores.queryOptions({ input: { eventId } })
  );
  const galleryQuery = useQuery(
    orpc.submissions.gallery.queryOptions({
      input: { eventId, limit: 100 },
    })
  );

  const pool = poolQuery.data;
  const submissions = galleryQuery.data?.submissions ?? [];

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="flex flex-col gap-1">
        <a
          className="mb-2 flex w-fit items-center gap-1.5 text-muted-foreground text-sm hover:text-foreground"
          href="/organizer/events"
        >
          <ArrowLeftIcon className="size-3.5" />
          Back to events
        </a>
        <h1 className="font-bold font-display text-3xl text-foreground">
          Judging Console
        </h1>
        <p className="text-muted-foreground">
          Assign judges, watch progress, and review every score before results
          are computed.
        </p>
      </header>

      <ProgressPanel
        pool={pool}
        progress={progressQuery.data}
        status={progressQuery.status}
      />
      <BatchAssignPanel
        eventId={eventId}
        pool={pool}
        poolStatus={poolQuery.status}
      />
      <SingleAssignPanel
        eventId={eventId}
        pool={pool}
        submissions={submissions}
      />
      <ScoresPanel
        pool={pool}
        scores={scoresQuery.data}
        status={scoresQuery.status}
        submissions={submissions}
      />
    </div>
  );
}
