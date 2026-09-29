import { parseCSVRecordsWithRows } from "@rave/api/csv";

/**
 * Shared types, and the client-side mirror of the server's row validators.
 *
 * These checks exist to catch a structurally wrong file before the upload. The
 * server's dryRun stays authoritative about what the database would do — the
 * local pass is a courtesy, not the source of truth. The teams rule is
 * expressed as a function per kind because it accepts `owner_id` OR
 * `member_user_id`; a flat column list would reject files the server accepts,
 * which is worse than no local check at all.
 */

export interface ImportResult {
  created: number;
  errors: Array<{ field: string; message: string; row: number }>;
  skipped: number;
  updated: number;
}

export type ImportKind = "assignments" | "scores" | "submissions" | "teams";

export interface ParsedFile {
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
export const MISSING_COLUMNS: Record<
  ImportKind,
  (cols: Set<string>) => string[]
> = {
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

export function missing(cols: Set<string>, required: string[]): string[] {
  return required.filter((c) => !cols.has(c));
}

export const MAX_PREVIEW_ROWS = 5;

export const IMPORT_COPY: Record<ImportKind, { blurb: string; title: string }> =
  {
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

export function parseImportFile(text: string): ParsedFile {
  const parsed = parseCSVRecordsWithRows(text);
  const rows = [...parsed];
  const headers = rows[0]
    ? Object.keys(rows[0].record)
    : (text.split("\n")[0] ?? "").split(",").map((h) => h.trim());
  return { headers, rowCount: rows.length, rows, text };
}

export function missingColumns(
  parsed: ParsedFile | null,
  kind: ImportKind
): string[] {
  if (!parsed) {
    return [];
  }
  const present = new Set(parsed.headers.map((h) => h.trim().toLowerCase()));
  return MISSING_COLUMNS[kind](present);
}
