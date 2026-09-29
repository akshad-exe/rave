/**
 * Trigger a browser download for text content the API returned inline.
 *
 * Exports come back as a CSV string in the RPC response rather than as a
 * redirecting download URL, so the blob is assembled here. Revoking the object
 * URL matters: without it the file stays pinned in memory for the life of the
 * document, and clicking Export repeatedly leaks one per click.
 */
export function downloadTextFile(
  filename: string,
  contents: string,
  mimeType = "text/csv;charset=utf-8"
): void {
  const blob = new Blob([contents], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

/** `2026-09-29-score-export.csv` — sorts chronologically, no colons. */
export function timestampedFilename(base: string, extension = "csv"): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const stamp = [
    now.getFullYear(),
    pad(now.getMonth() + 1),
    pad(now.getDate()),
  ].join("-");
  return `${stamp}-${base}.${extension}`;
}
