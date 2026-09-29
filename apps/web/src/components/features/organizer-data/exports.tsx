import { Button } from "@rave/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@rave/ui/components/card";
import { DownloadIcon } from "lucide-react";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { downloadTextFile, timestampedFilename } from "@/lib/download";
import { client } from "@/utils/orpc";

export interface ExportDef {
  filename: string;
  key: string;
  label: string;
  run: (eventId: string) => Promise<{ csv: string }>;
}

export const EXPORTS: ExportDef[] = [
  {
    filename: "submissions",
    key: "submissions",
    label: "Submissions",
    run: (eventId) => client.exports.submissions({ eventId }),
  },
  {
    filename: "teams",
    key: "teams",
    label: "Teams",
    run: (eventId) => client.exports.teams({ eventId }),
  },
  {
    filename: "scores",
    key: "rawScores",
    label: "Raw scores",
    run: (eventId) => client.exports.rawScores({ eventId }),
  },
  {
    filename: "assignments",
    key: "assignments",
    label: "Judge assignments",
    run: (eventId) => client.exports.assignments({ eventId }),
  },
  {
    filename: "results",
    key: "results",
    label: "Results",
    run: (eventId) => client.exports.results({ eventId }),
  },
];

/**
 * The five CSV exports.
 *
 * The operations return the content inline rather than redirecting, so the
 * download is assembled in the browser. Revoking the object URL matters:
 * without it the file stays pinned for the life of the document and repeated
 * exports leak one blob per click.
 */

export function ExportSection({ eventId }: { eventId: string }) {
  const [pendingKey, setPendingKey] = useState<string | null>(null);

  const handleExport = useCallback(
    async (def: ExportDef) => {
      setPendingKey(def.key);
      try {
        const { csv } = await def.run(eventId);
        downloadTextFile(
          timestampedFilename(`${eventId}-${def.filename}`),
          csv
        );
        toast.success(`${def.label} exported`);
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : `Could not export ${def.label}`
        );
      } finally {
        setPendingKey(null);
      }
    },
    [eventId]
  );

  return (
    <Card variant="default">
      <CardHeader>
        <CardTitle>Export</CardTitle>
        <CardDescription>
          Each export is a plain CSV you can open in a spreadsheet. Use these
          before deleting an event, or to keep your own copy.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2.5">
        {EXPORTS.map((def) => (
          <Button
            data-export={def.key}
            disabled={pendingKey !== null}
            key={def.key}
            onClick={handleExportClick(def, handleExport)}
            variant="outline"
          >
            <DownloadIcon className="size-4" />
            {pendingKey === def.key ? "Preparing…" : def.label}
          </Button>
        ))}
      </CardContent>
    </Card>
  );
}

export function handleExportClick(
  def: ExportDef,
  handleExport: (def: ExportDef) => Promise<void>
) {
  return () => {
    handleExport(def);
  };
}
