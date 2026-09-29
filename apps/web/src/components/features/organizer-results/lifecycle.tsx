import { Button } from "@rave/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@rave/ui/components/card";
import { LockIcon, RocketIcon } from "lucide-react";

/**
 * The two irreversible actions, presented as buttons here and confirmed in the
 * dialog the page owns. Both are recorded in the audit log and neither can be
 * undone, so neither is a single click.
 */

export function LifecyclePanel({
  onConfirm,
}: {
  onConfirm: (which: "lock" | "reveal") => void;
}) {
  return (
    <Card variant="default">
      <CardHeader>
        <CardTitle>Finalize</CardTitle>
        <CardDescription>
          Both actions are recorded in the audit log and cannot be undone.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-3">
        <Button
          className="gap-2"
          onClick={handleLifecycleClick(onConfirm, "lock")}
          variant="outline"
        >
          <LockIcon className="size-4" />
          Lock scores
        </Button>
        <Button
          className="gap-2"
          onClick={handleLifecycleClick(onConfirm, "reveal")}
        >
          <RocketIcon className="size-4" />
          Publish results
        </Button>
      </CardContent>
    </Card>
  );
}

export function handleLifecycleClick(
  onConfirm: (which: "lock" | "reveal") => void,
  which: "lock" | "reveal"
) {
  return () => {
    onConfirm(which);
  };
}
