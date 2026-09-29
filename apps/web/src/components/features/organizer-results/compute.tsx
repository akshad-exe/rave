import { Alert } from "@rave/ui/components/alert";
import { Button } from "@rave/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@rave/ui/components/card";
import { Label } from "@rave/ui/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@rave/ui/components/select";
import { Switch } from "@rave/ui/components/switch";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { orpc } from "@/utils/orpc";
import type { RubricRow } from "./shared";

/**
 * Compute normalized results.
 *
 * Scores are z-normalised per judge before aggregation, so one generous judge
 * cannot dominate the outcome. The result is stored, so this replaces the
 * previous computation rather than adding to it.
 */

export function ComputePanel({
  eventId,
  rubrics,
  trackId,
}: {
  eventId: string;
  rubrics: RubricRow[] | undefined;
  trackId: string | undefined;
}) {
  const queryClient = useQueryClient();
  const [rubricId, setRubricId] = useState("");
  const [useNormalization, setUseNormalization] = useState(true);

  const eligible = useMemo(
    () =>
      (rubrics ?? []).filter(
        (r) => !trackId || r.trackId === trackId || r.trackId === null
      ),
    [rubrics, trackId]
  );

  const selected = eligible.find((r) => r.id === rubricId) ?? eligible[0];

  const computeMutation = useMutation(orpc.results.compute.mutationOptions());

  const handleRubricChange = useCallback((value: string | null) => {
    setRubricId(value ?? "");
  }, []);

  const handleNormalizationChange = useCallback((checked: boolean) => {
    setUseNormalization(checked);
  }, []);

  const handleCompute = useCallback(async () => {
    if (!selected) {
      return;
    }
    try {
      await computeMutation.mutateAsync({
        eventId,
        rubricId: selected.id,
        trackId,
        useNormalization,
      });
      toast.success("Results computed");
      queryClient
        .invalidateQueries(
          orpc.results.getAdmin.queryOptions({ input: { eventId } })
        )
        .catch(() => undefined);
      queryClient
        .invalidateQueries(
          orpc.results.getPublished.queryOptions({
            input: { eventId, limit: 100, page: 1 },
          })
        )
        .catch(() => undefined);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Compute failed");
    }
  }, [
    computeMutation,
    eventId,
    queryClient,
    selected,
    trackId,
    useNormalization,
  ]);

  return (
    <Card variant="default">
      <CardHeader>
        <CardTitle>Compute results</CardTitle>
        <CardDescription>
          Scores are normalized per judge with a z-score before aggregation, so
          one generous judge cannot dominate.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {eligible.length === 0 ? (
          <Alert
            description="Results need a rubric. Create one for this event before computing."
            title="No rubric yet"
            variant="warning"
          />
        ) : (
          <div className="flex flex-wrap items-end gap-4">
            <div className="min-w-56 flex-1">
              <Label className="mb-1.5 block text-xs" htmlFor="rubric-select">
                Rubric
              </Label>
              <Select
                onValueChange={handleRubricChange}
                value={selected?.id ?? null}
              >
                <SelectTrigger id="rubric-select" />
                <SelectContent>
                  {eligible.map((rubric) => (
                    <SelectItem key={rubric.id} value={rubric.id}>
                      {rubric.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2.5 pb-2">
              <Switch
                checked={useNormalization}
                id="use-normalization"
                onCheckedChange={handleNormalizationChange}
              />
              <label
                className="cursor-pointer text-sm"
                htmlFor="use-normalization"
              >
                Normalize per judge
              </label>
            </div>
            <Button
              disabled={computeMutation.isPending || !selected}
              onClick={handleCompute}
            >
              {computeMutation.isPending ? "Computing…" : "Compute results"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
