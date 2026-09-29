import { Alert } from "@rave/ui/components/alert";
import { Button } from "@rave/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@rave/ui/components/card";
import {
  Combobox,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxItem,
  ComboboxList,
} from "@rave/ui/components/combobox";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { handleAsync } from "@/lib/handlers";
import { orpc } from "@/utils/orpc";
import type { GalleryRow, JudgePoolEntry } from "./shared";

/**
 * One judge against one project, for a gap the batch pass could not fill — a
 * late judge, or one added after assignment went out.
 *
 * There is no per-project coverage figure anywhere in the API, so this panel
 * says so rather than implying a number it cannot compute.
 */

export function SingleAssignPanel({
  eventId,
  pool,
  submissions,
}: {
  eventId: string;
  pool: JudgePoolEntry[] | undefined;
  submissions: GalleryRow[];
}) {
  const queryClient = useQueryClient();
  const [submissionId, setSubmissionId] = useState("");
  const [judgeId, setJudgeId] = useState("");

  const assignMutation = useMutation(orpc.assignments.assign.mutationOptions());
  const items = useMemo(
    () =>
      (pool ?? []).map((judge) => ({
        label: judge.name,
        value: judge.id,
      })),
    [pool]
  );
  const projectItems = useMemo(
    () => submissions.map((s) => ({ label: s.name, value: s.id })),
    [submissions]
  );

  const handleAssign = useCallback(async () => {
    if (!(submissionId && judgeId)) {
      return;
    }
    try {
      await assignMutation.mutateAsync({ eventId, judgeId, submissionId });
      toast.success("Judge assigned");
      queryClient
        .invalidateQueries(
          orpc.assignments.progress.queryOptions({ input: { eventId } })
        )
        .catch(() => undefined);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not assign");
    }
  }, [assignMutation, eventId, judgeId, queryClient, submissionId]);

  const handleJudgeChange = useCallback((next: string | null) => {
    setJudgeId(next ?? "");
  }, []);

  const handleProjectChange = useCallback((next: string | null) => {
    setSubmissionId(next ?? "");
  }, []);

  const selectedProject = projectItems.find((p) => p.value === submissionId);

  return (
    <Card variant="default">
      <CardHeader>
        <CardTitle>Single assignment</CardTitle>
        <CardDescription>
          Add one judge to one project, for a coverage gap the batch pass could
          not fill — a late judge, or one added after assignment.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {projectItems.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No submitted projects to assign against yet.
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
            <Combobox
              items={projectItems}
              onValueChange={handleProjectChange}
              value={submissionId}
            >
              <ComboboxChips>
                <ComboboxChipsInput placeholder="Choose a project…" />
              </ComboboxChips>
              <ComboboxContent>
                <ComboboxEmpty>No project matches.</ComboboxEmpty>
                <ComboboxList>
                  {projectItems.map((item) => (
                    <ComboboxItem key={item.value} value={item.value}>
                      {item.label}
                    </ComboboxItem>
                  ))}
                </ComboboxList>
              </ComboboxContent>
            </Combobox>
            <Combobox
              items={items}
              onValueChange={handleJudgeChange}
              value={judgeId}
            >
              <ComboboxChips>
                <ComboboxChipsInput placeholder="Choose a judge…" />
              </ComboboxChips>
              <ComboboxContent>
                <ComboboxEmpty>No judge matches.</ComboboxEmpty>
                <ComboboxList>
                  {items.map((item) => (
                    <ComboboxItem key={item.value} value={item.value}>
                      {item.label}
                    </ComboboxItem>
                  ))}
                </ComboboxList>
              </ComboboxContent>
            </Combobox>
            <Button
              disabled={assignMutation.isPending || !submissionId || !judgeId}
              onClick={handleAsync(handleAssign)}
            >
              {assignMutation.isPending ? "Assigning…" : "Assign"}
            </Button>
          </div>
        )}

        {selectedProject ? (
          <Alert
            description={`Coverage for “${selectedProject.label}” is set by the batch pass above. Per-judge counts for this project are not available from the API, so use the progress table above to see who is still outstanding.`}
            title="Per-project coverage"
            variant="info"
          />
        ) : null}
      </CardContent>
    </Card>
  );
}
