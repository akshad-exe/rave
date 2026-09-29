import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * The published spec is only worth anything if it matches the router. This
 * fails the moment a procedure is added, renamed or removed without re-running
 * `bun run openapi`, so a stale document cannot be committed unnoticed.
 */
const OPENAPI_31 = /^3\.1\.\d+$/;

describe("published OpenAPI spec", () => {
  const specPath = join(process.cwd(), "../../docs/openapi.json");
  const spec = JSON.parse(readFileSync(specPath, "utf8")) as {
    info?: { title?: string; version?: string };
    openapi?: string;
    paths?: Record<string, Record<string, unknown>>;
  };

  it("is a valid 3.1 document with an info block", () => {
    // oRPC emits 3.1.1; assert the minor series, not an exact patch.
    expect(spec.openapi).toMatch(OPENAPI_31);
    expect(spec.info?.title).toBe("Rave API");
    expect(spec.info?.version).toBeTruthy();
  });

  it("documents every router group the app serves", () => {
    const paths = Object.keys(spec.paths ?? {});
    // These are the prefixes oRPC derives from the router, which is not always
    // the router's own name: the judging router surfaces as /assignments.
    for (const group of [
      "admin",
      "assignments",
      "comments",
      "events",
      "prizes",
      "rubrics",
      "submissions",
      "teams",
      "tracks",
      "voting",
    ]) {
      expect(
        paths.some((path) => path.includes(`/${group}`)),
        `no documented path for ${group}`
      ).toBe(true);
    }
  });

  it("gives every operation a tag and a summary", () => {
    const untagged: string[] = [];
    for (const [path, methods] of Object.entries(spec.paths ?? {})) {
      for (const [method, operation] of Object.entries(methods)) {
        if (!["get", "post", "put", "patch", "delete"].includes(method)) {
          continue;
        }
        const meta = operation as { summary?: string; tags?: string[] };
        if (!meta.summary || (meta.tags ?? []).length === 0) {
          untagged.push(`${method.toUpperCase()} ${path}`);
        }
      }
    }
    expect(untagged).toEqual([]);
  });

  it("includes the bulk import endpoints added for the migration path", () => {
    const paths = Object.keys(spec.paths ?? {});
    expect(paths.some((path) => path.includes("imports/submissions"))).toBe(
      true
    );
    expect(paths.some((path) => path.includes("imports/scores"))).toBe(true);
  });
});
