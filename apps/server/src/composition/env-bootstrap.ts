// This module must be the FIRST import of the server entry. It exists purely
// for import ordering, which is load-bearing:
//
//   1. `varlock/auto-load` (the normal path) execs the varlock CLI out of
//      node_modules/.bin. The production image is a single compiled binary
//      with no node_modules and no CLI, so that path cannot work there.
//   2. varlock's ENV proxy initialises lazily on its first property read, and a
//      failed init is unrecoverable: later reads throw "varlock ENV not
//      initialized". Because ES modules evaluate all static imports before the
//      importing module's body, anything that reads ENV during import
//      evaluation beats a blob published from the entry module's body.
//
// So production resolves the environment itself, from the same .env.schema that
// varlock would have used, and initialises eagerly. Development still uses
// auto-load, because resolving .env from disk is exactly what it is for.
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { initVarlockEnv } from "varlock/env";

interface SchemaEntry {
  type: string | null;
  value: string;
}

const SCHEMA_CANDIDATES = [
  process.env.ENV_SCHEMA_PATH,
  join(process.cwd(), "apps/server/.env.schema"),
  "/app/apps/server/.env.schema",
];

const TYPE_DIRECTIVE = /^#\s*@type=(.+)$/;

// varlock's .env.schema is a flat `KEY=value` list, with the type carried on a
// preceding `# @type=` comment. Only that subset is needed here, and anything
// unrecognised is skipped rather than guessed at.
function readSchema(): Map<string, SchemaEntry> {
  const source = SCHEMA_CANDIDATES.map(
    (path) => path && readFileSync(path, "utf8")
  ).find(Boolean);
  if (!source) {
    throw new Error(
      `Could not find .env.schema. Looked in: ${SCHEMA_CANDIDATES.filter(Boolean).join(", ")}. Set ENV_SCHEMA_PATH to override.`
    );
  }

  const entries = new Map<string, SchemaEntry>();
  let type: string | null = null;
  for (const line of source.split("\n")) {
    const trimmed = line.trim();
    const typeDirective = TYPE_DIRECTIVE.exec(trimmed);
    if (typeDirective) {
      type = typeDirective[1]?.trim() ?? null;
      continue;
    }
    if (trimmed === "" || trimmed.startsWith("#")) {
      continue;
    }
    const separator = trimmed.indexOf("=");
    if (separator === -1) {
      continue;
    }
    entries.set(trimmed.slice(0, separator), {
      type,
      value: trimmed.slice(separator + 1),
    });
    type = null;
  }
  return entries;
}

// varlock's CLI coerces to the annotated type before handing values to the
// runtime; without that, ENV.PORT stays a string and listen() silently binds a
// random port instead of failing.
function coerce(raw: string, type: string | null): unknown {
  if (type?.startsWith("number")) {
    return Number(raw);
  }
  if (type?.startsWith("boolean")) {
    return raw === "true";
  }
  return raw;
}

if (process.env.NODE_ENV === "production") {
  const config = Object.fromEntries(
    [...readSchema()].map(([key, schema]) => {
      const raw = process.env[key] ?? schema.value;
      return [key, { value: coerce(raw, schema.type) }];
    })
  );

  (globalThis as { __varlockLoadedEnv?: unknown }).__varlockLoadedEnv = {
    config,
    errors: false,
    injectedAtBuild: false,
    settings: {},
  };
  initVarlockEnv({ allowFail: true });
}
