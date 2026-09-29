import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/page-header";
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
      <PageHeader
        backLabel="Back to events"
        description="Assign judges, watch progress, and review every score before results are computed."
        title="Judging Console"
        to="/organizer/events"
      />

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
