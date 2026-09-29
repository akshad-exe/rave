import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * The acceptance checker reaches the system over HTTP, so it cannot see whether
 * a person can reach a surface. An operation can therefore be implemented,
 * unit-tested and checker-verified while being unreachable by a person clicking
 * through the app — which is exactly what happened: 37 of 70 operations were
 * unreachable when this guard was written.
 *
 * These two checks make that class of gap fail the suite instead of waiting for
 * a manual audit. The dead-link check in particular is the second attempt; the
 * first was written with a `startswith` fallback that excused three genuinely
 * broken links under /organizer and reported zero.
 */

const REPO_ROOT = join(process.cwd(), "../..");
const ROUTES_DIR = join(REPO_ROOT, "apps/web/src/routes");
const WEB_SRC = join(REPO_ROOT, "apps/web/src");
const OPENAPI_PATH = join(REPO_ROOT, "docs/openapi.json");
const ROUTE_TREE = join(REPO_ROOT, "apps/web/src/routeTree.gen.ts");

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry === "routeTree.gen.ts") {
      continue;
    }
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      out.push(...walk(full));
    } else if (TSX_FILE_RE.test(entry)) {
      out.push(full);
    }
  }
  return out;
}

/** Hoisted: these are reused across helpers, and a per-use literal recompiles. */
const FULL_PATH_RE = /fullPath: '([^']+)'/g;
const TRAILING_SLASH_RE = /\/$/;
const TSX_FILE_RE = /\.tsx?$/;

const ALL_ROUTE_FILES = walk(ROUTES_DIR);
const ALL_WEB_FILES = walk(WEB_SRC);

// ─── Operation reachability ───────────────────────────────────────────────────

const spec = JSON.parse(readFileSync(OPENAPI_PATH, "utf8")) as {
  paths?: Record<string, Record<string, unknown>>;
};

const ALL_OPERATIONS = new Set<string>();
for (const item of Object.values(spec.paths ?? {})) {
  for (const entry of Object.values(item)) {
    if (
      entry &&
      typeof entry === "object" &&
      "operationId" in entry &&
      typeof (entry as { operationId: unknown }).operationId === "string"
    ) {
      ALL_OPERATIONS.add((entry as { operationId: string }).operationId);
    }
  }
}

/**
 * Operations with no UI, each with the reason it is acceptable. This is an
 * allowlist rather than a count, so a *newly added* operation with no screen
 * fails the suite — which a bare minimum-coverage threshold would miss until
 * enough operations were added to drop back under it.
 */
const DELIBERATELY_UNREACHABLE: Record<string, string> = {
  healthCheck:
    "Infrastructure probe. The container healthcheck calls GET / directly, so an RPC form of this would be a duplicate rather than a surface.",
  privateData:
    "Only referenced by the leftover better-auth scaffold at routes/_auth/dashboard.tsx, which is not a product surface.",
};

const MIN_REACHABLE = 70;

/**
 * Matches call sites only: a query/mutation options factory, or a direct
 * invocation. A bare `orpc.foo.bar` is ambiguous because the same expression
 * appears in type aliases such as `Awaited<ReturnType<typeof client.x.y>>`,
 * and counting those would report coverage that does not exist.
 */
function calledOperations(): Set<string> {
  const found = new Set<string>();
  const optionsCall =
    /\b(?:orpc|client)\.([a-zA-Z]+)\.([a-zA-Z]+)\s*\.\s*(?:queryOptions|mutationOptions)\s*\(/g;
  const directCall = /\bclient\.([a-zA-Z]+)\.([a-zA-Z]+)\s*\(/g;
  // `orpc.me.queryOptions()` is two levels, not three: the router and the
  // operation share a name.
  const flatCall = /\borpc\.me\.queryOptions\s*\(/g;

  for (const file of ALL_WEB_FILES) {
    const text = readFileSync(file, "utf8");
    for (const m of text.matchAll(optionsCall)) {
      found.add(`${m[1]}.${m[2]}`);
    }
    for (const m of text.matchAll(directCall)) {
      found.add(`${m[1]}.${m[2]}`);
    }
    if (flatCall.test(text)) {
      found.add("me");
    }
  }
  return found;
}

describe("API operations are reachable from the UI", () => {
  const called = calledOperations();
  const reachable = [...ALL_OPERATIONS].filter((op) => called.has(op));
  const uncovered = [...ALL_OPERATIONS].filter(
    (op) => !(called.has(op) || op in DELIBERATELY_UNREACHABLE)
  );
  const staleAllowlist = Object.keys(DELIBERATELY_UNREACHABLE).filter(
    (op) => !ALL_OPERATIONS.has(op)
  );

  it("parses every operation out of the published spec", () => {
    expect(ALL_OPERATIONS.size).toBeGreaterThan(0);
  });

  it("leaves no operation without a UI and without a recorded reason", () => {
    expect(
      uncovered,
      uncovered.length
        ? `These operations have no UI surface. Add a screen, or add an entry to DELIBERATELY_UNREACHABLE in this file with a reason:\n  ${uncovered.join("\n  ")}`
        : ""
    ).toEqual([]);
  });

  it("has no allowlist entry for an operation that no longer exists", () => {
    expect(
      staleAllowlist,
      `Remove these from DELIBERATELY_UNREACHABLE, they are not in the spec: ${staleAllowlist.join(", ")}`
    ).toEqual([]);
  });

  it("keeps reachability at or above the ratchet", () => {
    const percent = Math.round((reachable.length / ALL_OPERATIONS.size) * 100);
    expect(
      `${reachable.length}/${ALL_OPERATIONS.size} (${percent}%)`,
      `Reachability fell below the ratchet. MIN_REACHABLE is ${MIN_REACHABLE}: ` +
        "raise it if coverage improved, never lower it."
    ).toBe(`${reachable.length}/${ALL_OPERATIONS.size} (${percent}%)`);
    expect(reachable.length).toBeGreaterThanOrEqual(MIN_REACHABLE);
  });
});

// ─── Dead internal links ──────────────────────────────────────────────────────

/**
 * The generated route tree is the only trustworthy source of resolved paths.
 * The `path:` field holds partial segments; `fullPath:` is what the router
 * actually serves, with route groups already stripped.
 */
function resolvedRoutePaths(): string[] {
  const text = readFileSync(ROUTE_TREE, "utf8");
  return [
    ...new Set(
      [...text.matchAll(FULL_PATH_RE)].map(
        ({ 1: fullPath }) => fullPath?.replace(TRAILING_SLASH_RE, "") || "/"
      )
    ),
  ];
}

/** `/gallery/` and `/gallery` are the same route; `$id` matches one segment. */
function toMatcher(routePath: string): RegExp {
  const pattern = routePath
    .split("/")
    .map((segment) => {
      if (segment.startsWith("$")) {
        return "[^/]+";
      }
      if (segment === "*") {
        return ".*";
      }
      return segment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    })
    .join("/");
  return new RegExp(`^${pattern === "" ? "/" : pattern}$`);
}

const KNOWN_ROUTES = resolvedRoutePaths().map(toMatcher);

/**
 * Not internal routes: absolute URLs, protocol-relative hosts, mail/tel, and
 * in-page anchors. Note the deliberate absence of a bare `\/` — every internal
 * route starts with a slash, so including one here silently discards every
 * link the check exists to examine.
 */
const IGNORED_LINK = /^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i;
const LINK_ATTRIBUTE = /\b(?:to|href)=["']([^"']+)["']/g;

/** How many links the extractor considers, before any are judged dead. */
function countCheckedLinks(): number {
  let count = 0;
  for (const file of ALL_WEB_FILES) {
    for (const m of readFileSync(file, "utf8").matchAll(LINK_ATTRIBUTE)) {
      const { 1: raw } = m;
      if (raw?.startsWith("/") && !IGNORED_LINK.test(raw)) {
        count += 1;
      }
    }
  }
  return count;
}

interface DeadLink {
  file: string;
  line: number;
  target: string;
}

function findDeadLinks(): DeadLink[] {
  const dead: DeadLink[] = [];
  for (const file of ALL_WEB_FILES) {
    const text = readFileSync(file, "utf8");
    for (const m of text.matchAll(LINK_ATTRIBUTE)) {
      const { 1: raw } = m;
      // Absolute URLs, anchors and asset paths are not routes.
      if (!raw?.startsWith("/") || IGNORED_LINK.test(raw)) {
        continue;
      }
      // Same normalization as the route side, including the root fallback:
      // stripping the trailing slash from "/" yields "", which would then fail
      // to match the root route and be reported as dead.
      const target =
        raw.split("?")[0]?.split("#")[0]?.replace(TRAILING_SLASH_RE, "") || "/";
      if (!KNOWN_ROUTES.some((matcher) => matcher.test(target))) {
        const line = text.slice(0, m.index).split("\n").length;
        dead.push({ file: relative(REPO_ROOT, file), line, target: raw });
      }
    }
  }
  return dead;
}

describe("internal links resolve to a real route", () => {
  it("reads a non-empty set of routes out of the generated tree", () => {
    expect(resolvedRoutePaths().length).toBeGreaterThan(10);
  });

  it("has no link pointing at a route that does not exist", () => {
    const dead = findDeadLinks();
    expect(
      dead,
      dead.length
        ? [
            "These links point at routes that do not exist:",
            ...dead.map((d) => `  ${d.file}:${d.line}  ${d.target}`),
            "",
            "Resolved routes are read from fullPath in routeTree.gen.ts. A",
            "startswith or prefix comparison will excuse broken links — the",
            "first version of this check did exactly that and reported zero.",
          ].join("\n")
        : ""
    ).toEqual([]);
  });

  it("covers the route files rather than a sample of them", () => {
    // A guard that quietly stops reading the tree would pass vacuously.
    expect(ALL_ROUTE_FILES.length).toBeGreaterThan(10);
  });

  it("actually extracts internal links to check", () => {
    // The first version of this check skipped every internal link, because its
    // ignore-pattern contained a bare `\/` and every route starts with one. All
    // three link tests then passed without examining a single link. This
    // assertion is what makes that failure mode loud instead of silent.
    const checked = countCheckedLinks();
    expect(
      checked,
      "no internal links were examined, so the dead-link check is vacuous"
    ).toBeGreaterThan(20);
  });
});
