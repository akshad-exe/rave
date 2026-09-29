import { Alert } from "@rave/ui/components/alert";
import { Badge } from "@rave/ui/components/badge";
import { Button } from "@rave/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@rave/ui/components/card";
import { Input } from "@rave/ui/components/input";
import { Label } from "@rave/ui/components/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@rave/ui/components/table";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@rave/ui/components/tabs";
import { useMutation } from "@tanstack/react-query";
import { FileSpreadsheetIcon, TriangleAlertIcon } from "lucide-react";
import type * as React from "react";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { handleAsync } from "@/lib/handlers";
import { orpc } from "@/utils/orpc";
import {
  IMPORT_COPY,
  type ImportKind,
  type ImportResult,
  MAX_PREVIEW_ROWS,
  missingColumns,
  type ParsedFile,
  parseImportFile,
} from "./shared";

/**
 * Bulk import behind a preview-then-commit flow.
 *
 * Pick a file, check the columns locally, ask the server for a dry run, then
 * commit. A preview never writes. Per-row failures carry the spreadsheet line
 * number, which is why the shared parser keeps row offsets.
 *
 * The Tabs wrapper is index-based, so the mapping back to a kind is explicit
 * rather than assumed.
 */

export function ImportSection({ eventId }: { eventId: string }) {
  const [kind, setKind] = useState<ImportKind>("submissions");

  const submissions = useMutation(
    orpc.exports.importSubmissions.mutationOptions()
  );
  const scores = useMutation(orpc.exports.importScores.mutationOptions());
  const teams = useMutation(orpc.exports.importTeams.mutationOptions());
  const assignments = useMutation(
    orpc.exports.importAssignments.mutationOptions()
  );

  const runner = {
    assignments: (csv: string, dryRun: boolean) =>
      assignments.mutateAsync({ csv, dryRun, eventId }),
    scores: (csv: string, dryRun: boolean) =>
      scores.mutateAsync({ csv, dryRun, eventId }),
    submissions: (csv: string, dryRun: boolean) =>
      submissions.mutateAsync({ csv, dryRun, eventId }),
    teams: (csv: string, dryRun: boolean) =>
      teams.mutateAsync({ csv, dryRun, eventId }),
  }[kind];

  const isPending =
    submissions.isPending ||
    scores.isPending ||
    teams.isPending ||
    assignments.isPending;

  return (
    <Card variant="default">
      <CardHeader>
        <CardTitle>Import</CardTitle>
        <CardDescription>
          Pick a file, check what would happen, then commit. A preview never
          writes anything.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <Tabs onChange={handleTabChange(setKind)}>
          <TabsList>
            {IMPORT_ORDER.map((k, index) => (
              <TabsTrigger index={index} key={k}>
                {IMPORT_COPY[k].title}
              </TabsTrigger>
            ))}
          </TabsList>
          {IMPORT_ORDER.map((k, index) => (
            <TabsContent index={index} key={k}>
              <ImportPanel
                blurb={IMPORT_COPY[k].blurb}
                isPending={isPending}
                kind={k}
                onRun={runner}
              />
            </TabsContent>
          ))}
        </Tabs>
        <p className="text-muted-foreground text-xs">
          Importing {IMPORT_COPY[kind].title.toLowerCase()} into this event.
        </p>
      </CardContent>
    </Card>
  );
}

// Tabs reports an index, not the trigger value, so map back to the kind.
const IMPORT_ORDER: ImportKind[] = [
  "submissions",
  "scores",
  "teams",
  "assignments",
];

function handleTabChange(setKind: (kind: ImportKind) => void) {
  return (index: number) => {
    const next = IMPORT_ORDER[index];
    if (next) {
      setKind(next);
    }
  };
}

function ImportPanel({
  kind,
  blurb,
  isPending,
  onRun,
}: {
  blurb: string;
  isPending: boolean;
  kind: ImportKind;
  onRun: (csv: string, dryRun: boolean) => Promise<unknown>;
}) {
  const [parsed, setParsed] = useState<ParsedFile | null>(null);
  const [fileName, setFileName] = useState("");
  const [preview, setPreview] = useState<ImportResult | null>(null);
  const [committed, setCommitted] = useState<ImportResult | null>(null);

  const handleFile = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) {
        return;
      }
      setFileName(file.name);
      setPreview(null);
      setCommitted(null);
      const text = await file.text();
      setParsed(parseImportFile(text));
    },
    []
  );

  const handlePreview = useCallback(async () => {
    if (!parsed) {
      return;
    }
    try {
      const res = (await onRun(parsed.text, true)) as ImportResult;
      setPreview(res);
      setCommitted(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Preview failed");
    }
  }, [onRun, parsed]);

  const handleCommit = useCallback(async () => {
    if (!parsed) {
      return;
    }
    try {
      const res = (await onRun(parsed.text, false)) as ImportResult;
      setCommitted(res);
      setPreview(null);
      toast.success(
        `Imported ${res.created + res.updated} rows, skipped ${res.skipped}`
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Import failed");
    }
  }, [onRun, parsed]);

  const missingCols = missingColumns(parsed, kind);

  return (
    <div className="space-y-4">
      <p className="text-muted-foreground text-sm">{blurb}</p>

      <div className="space-y-1.5">
        <Label className="block text-xs" htmlFor={`import-${kind}`}>
          CSV file
        </Label>
        <Input
          accept=".csv,text/csv"
          id={`import-${kind}`}
          onChange={handleFile}
          type="file"
        />
        {parsed ? (
          <p className="text-muted-foreground text-xs">
            {fileName} — {parsed.rowCount} data rows
          </p>
        ) : null}
      </div>

      {parsed ? (
        <ParsedFileSummary
          isPending={isPending}
          isPreview={preview !== null && committed === null}
          missing={missingCols}
          onCommit={handleCommit}
          onPreview={handlePreview}
          parsed={parsed}
          result={committed ?? preview}
        />
      ) : (
        <ImportEmptyState />
      )}
    </div>
  );
}

function ImportEmptyState() {
  return (
    <div className="flex flex-col items-center gap-2 rounded-lg border border-border border-dashed py-8 text-center">
      <FileSpreadsheetIcon className="size-6 text-muted-foreground/50" />
      <p className="text-muted-foreground text-sm">
        Choose a CSV to preview it before anything is written.
      </p>
    </div>
  );
}

function ParsedFileSummary({
  parsed,
  missing: missingCols,
  isPending,
  isPreview,
  result,
  onPreview,
  onCommit,
}: {
  isPending: boolean;
  isPreview: boolean;
  missing: string[];
  onCommit: () => Promise<void>;
  onPreview: () => Promise<void>;
  parsed: ParsedFile;
  result: ImportResult | null;
}) {
  return (
    <div className="space-y-4 rounded-lg border border-border bg-muted/20 p-4">
      {missingCols.length > 0 ? (
        <Alert
          description={`This file is missing required columns: ${missingCols.join(", ")}.`}
          title="Wrong shape for this import"
          variant="destructive"
        />
      ) : (
        <>
          <ColumnPreview headers={parsed.headers} rows={parsed.rows} />
          <div className="flex flex-wrap gap-2.5">
            <Button
              disabled={isPending}
              onClick={handleAsync(onPreview)}
              variant="outline"
            >
              {isPending ? "Checking…" : "Preview changes"}
            </Button>
            {isPreview ? (
              <Button disabled={isPending} onClick={handleAsync(onCommit)}>
                {isPending ? "Importing…" : "Confirm import"}
              </Button>
            ) : null}
          </div>
          {result ? <ImportResultPanel result={result} /> : null}
        </>
      )}
    </div>
  );
}

function ColumnPreview({
  headers,
  rows,
}: {
  headers: string[];
  rows: Array<{ record: Record<string, string>; row: number }>;
}) {
  const shown = rows.slice(0, MAX_PREVIEW_ROWS);
  return (
    <div className="space-y-2">
      <p className="font-medium text-sm">
        Detected columns: {headers.join(", ")}
      </p>
      {shown.length > 0 ? (
        <div className="overflow-x-auto rounded border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                {headers.map((h) => (
                  <TableHead key={h}>{h}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {shown.map(({ record, row }) => (
                <TableRow key={row}>
                  {headers.map((h) => (
                    <TableCell className="max-w-40 truncate" key={h}>
                      {record[h] || "—"}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : null}
      {rows.length > MAX_PREVIEW_ROWS ? (
        <p className="text-muted-foreground text-xs">
          Showing {MAX_PREVIEW_ROWS} of {rows.length} rows.
        </p>
      ) : null}
    </div>
  );
}

function ImportResultPanel({ result }: { result: ImportResult }) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Badge variant="success">{result.created} created</Badge>
        <Badge variant="default">{result.updated} updated</Badge>
        <Badge variant={result.skipped > 0 ? "warning" : "outline"}>
          {result.skipped} skipped
        </Badge>
        <Badge variant={result.errors.length > 0 ? "error" : "outline"}>
          {result.errors.length} errors
        </Badge>
      </div>
      {result.errors.length > 0 ? (
        <div className="space-y-2">
          <p className="flex items-center gap-1.5 font-medium text-sm">
            <TriangleAlertIcon className="size-3.5 text-warning" />
            Rows that need fixing
          </p>
          <ul className="space-y-1 text-sm">
            {result.errors.slice(0, 20).map((err) => (
              <li
                className="flex gap-3 text-muted-foreground"
                key={`${err.row}-${err.field}`}
              >
                <span className="shrink-0 tabular-nums">Row {err.row}</span>
                <span className="min-w-0">
                  <span className="text-foreground">{err.field}</span>:{" "}
                  {err.message}
                </span>
              </li>
            ))}
          </ul>
          {result.errors.length > 20 ? (
            <p className="text-muted-foreground text-xs">
              Showing 20 of {result.errors.length} errors.
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

// ─── Parsing ──────────────────────────────────────────────────────────────────
