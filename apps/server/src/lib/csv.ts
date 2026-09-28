export function escapeCSV(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function toCSV(headers: string[], rows: unknown[][]): string {
  const lines = [headers.map(escapeCSV).join(",")];
  for (const row of rows) {
    lines.push(row.map(escapeCSV).join(","));
  }
  return lines.join("\n");
}

/**
 * RFC 4180 parser, the inverse of toCSV. Hand-rolled so the repo gains no
 * dependency for the handful of fields an organizer actually imports.
 *
 * Handles quoted fields, embedded commas and newlines, escaped double quotes
 * (`""`), and CRLF or LF line endings. A trailing newline is not treated as an
 * extra row.
 */
export function parseCSV(input: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  let sawAnyChar = false;

  const endField = () => {
    row.push(field);
    field = "";
  };
  const endRow = () => {
    endField();
    rows.push(row);
    row = [];
  };

  for (let i = 0; i < input.length; i += 1) {
    const char = input[i];
    sawAnyChar = true;

    if (inQuotes) {
      if (char === '"') {
        // A doubled quote is a literal quote; anything else closes the field.
        if (input[i + 1] === '"') {
          field += '"';
          // Consume the escaped quote so the loop does not treat it as a closer.
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      endField();
    } else if (char === "\r") {
      // Swallow; the \n that follows ends the row.
    } else if (char === "\n") {
      endRow();
    } else {
      field += char;
    }
  }

  if (field !== "" || row.length > 0) {
    endRow();
  } else if (!sawAnyChar) {
    return [];
  }

  return rows;
}

/** Parse a CSV with a header row into objects keyed by the header names. */
export function parseCSVRecords(input: string): Record<string, string>[] {
  return parseCSVRecordsWithRows(input).map(({ record }) => record);
}

/**
 * As parseCSVRecords, but each record carries the line number an organizer
 * would see in their spreadsheet, so error reports can point at a row instead
 * of forcing callers to keep a counter.
 */
export function parseCSVRecordsWithRows(
  input: string
): Array<{ record: Record<string, string>; row: number }> {
  const rows = parseCSV(input);
  const [header, ...body] = rows;
  if (!header) {
    return [];
  }
  const columns = header.map((name) => name.trim());
  return (
    body
      // A trailing newline yields one empty row; drop rows that are entirely empty.
      .filter((values) => values.some((value) => value.trim() !== ""))
      .map((values, offset) => {
        const record: Record<string, string> = {};
        columns.forEach((column, index) => {
          record[column] = (values[index] ?? "").trim();
        });
        // Header is line 1, so the first data row is line 2.
        return { record, row: offset + 2 };
      })
  );
}
