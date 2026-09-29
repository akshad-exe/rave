import { parseCSVRecordsWithRows } from "@rave/api/csv";
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
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeftIcon,
  DownloadIcon,
  FileSpreadsheetIcon,
  TriangleAlertIcon,
} from "lucide-react";
import type * as React from "react";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { downloadTextFile, timestampedFilename } from "@/lib/download";
import { client, orpc } from "@/utils/orpc";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ImportResult {
  created: number;
  errors: Array<{ field: string; message: string; row: number }>;
  skipped: number;
  updated: number;
}

type ImportKind = "assignments" | "scores" | "submissions" | "teams";

interface ParsedFile {
  headers: string[];
  rowCount: number;
  rows: Array<{ record: Record<string, string>; row: number }>;
  text: string;
}

/**
 * Mirrors the server's per-row validators in exports/service.ts. A flat column
 * list cannot express the teams rule, which accepts `owner_id` OR
 * `member_user_id` rather than demanding both, so each kind checks its own
 * columns and the only columns it flags are ones the server would reject.
 *
 * These exist to catch a structurally wrong file before the upload. The
 * server's dryRun remains authoritative about what the database would do.
 */
const MISSING_COLUMNS: Record<ImportKind, (cols: Set<string>) => string[]> = {
  assignments: (cols) => missing(cols, ["judge_id", "submission_id"]),
  scores: (cols) => missing(cols, ["submission_id", "judge_id"]),
  submissions: (cols) => missing(cols, ["name"]),
  teams: (cols) => {
    const problems = missing(cols, ["team_name"]);
    if (!(cols.has("owner_id") || cols.has("member_user_id"))) {
      problems.push("owner_id or member_user_id");
    }
    return problems;
  },
};

function missing(cols: Set<string>, required: string[]): string[] {
  return required.filter((c) => !cols.has(c));
}

const MAX_PREVIEW_ROWS = 5;

const IMPORT_COPY: Record<ImportKind, { blurb: string; title: string }> = {
  assignments: {
    blurb: "Bulk-assign judges to projects.",
    title: "Assignments",
  },
  scores: {
    blurb: "Pre-loaded score sheets, for judging that happens offline.",
    title: "Scores",
  },
  submissions: {
    blurb: "Project entries, for migrating an existing event.",
    title: "Submissions",
  },
  teams: {
    blurb: "Team rosters, so participants keep their existing teams.",
    title: "Teams",
  },
};

// ─── Route ────────────────────────────────────────────────────────────────────

export const Route = createFileRoute(
  "/(organizer)/organizer/events/$eventId/data/"
)({
  component: DataPage,
});

// ─── Page ─────────────────────────────────────────────────────────────────────

function DataPage() {
  const { eventId } = Route.useParams();

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header className="flex flex-col gap-1">
        <Link
          className="mb-2 flex w-fit items-center gap-1.5 text-muted-foreground text-sm hover:text-foreground"
          to="/organizer/events"
        >
          <ArrowLeftIcon className="size-3.5" />
          Back to events
        </Link>
        <h1 className="font-bold font-display text-3xl text-foreground">
          Data
        </h1>
        <p className="text-muted-foreground">
          Take your data out, and bring data in. Nothing here leaves a platform
          you cannot leave.
        </p>
      </header>

      <ExportSection eventId={eventId} />
      <ImportSection eventId={eventId} />
    </div>
  );
}

// ─── Exports ──────────────────────────────────────────────────────────────────

interface ExportDef {
  filename: string;
  key: string;
  label: string;
  run: (eventId: string) => Promise<{ csv: string }>;
}

const EXPORTS: ExportDef[] = [
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

function ExportSection({ eventId }: { eventId: string }) {
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

function handleExportClick(
  def: ExportDef,
  handleExport: (def: ExportDef) => Promise<void>
) {
  return () => {
    handleExport(def);
  };
}

// ─── Imports ──────────────────────────────────────────────────────────────────

function ImportSection({ eventId }: { eventId: string }) {
  const [kind, setKind] = useState<ImportKind>("submissions");
  const copy = IMPORT_COPY[kind];

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
          Importing {copy.title.toLowerCase()} into this event.
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

function handleAsync(fn: () => Promise<void>) {
  return () => {
    fn();
  };
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

function parseImportFile(text: string): ParsedFile {
  const parsed = parseCSVRecordsWithRows(text);
  const rows = [...parsed];
  const headers = rows[0]
    ? Object.keys(rows[0].record)
    : (text.split("\n")[0] ?? "").split(",").map((h) => h.trim());
  return { headers, rowCount: rows.length, rows, text };
}

function missingColumns(parsed: ParsedFile | null, kind: ImportKind): string[] {
  if (!parsed) {
    return [];
  }
  const present = new Set(parsed.headers.map((h) => h.trim().toLowerCase()));
  return MISSING_COLUMNS[kind](present);
}
