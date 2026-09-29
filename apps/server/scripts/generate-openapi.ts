/**
 * Publish the OpenAPI specification to docs/openapi.json.
 *
 * The spec is also served interactively at /api-reference, but a served page
 * is not something a reviewer can diff, consume, or file an issue against. Both
 * are generated from the same router and the same options, so the published
 * file and the reference UI cannot drift apart.
 */

import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { OpenAPIGenerator } from "@orpc/openapi";
import { ZodToJsonSchemaConverter } from "@orpc/zod/zod4";
import { appRouter } from "@rave/api/routers/index";

import { OPENAPI_SPEC_OPTIONS } from "../src/plugins/orpc";

const repoRoot = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  ".."
);
const outputPath = join(repoRoot, "docs", "openapi.json");

const generator = new OpenAPIGenerator({
  schemaConverters: [new ZodToJsonSchemaConverter()],
});

const spec = await generator.generate(appRouter, {
  ...OPENAPI_SPEC_OPTIONS,
  info: {
    description:
      'Rave — hackathon submission and judging platform. Every procedure below is reachable over POST /rpc/<router>/<procedure> with an oRPC JSON body of {"json": <input>}. The declared method and path below are the intended REST shape; see docs/ARCHITECTURE.md for why the runtime serves RPC framing instead.',
    title: "Rave API",
    version: "1.0.0",
  },
});

writeFileSync(outputPath, `${JSON.stringify(spec, null, 2)}\n`, "utf8");

const paths = Object.keys(spec.paths ?? {});
const operations = paths.reduce(
  (total, path) =>
    total +
    Object.keys(spec.paths?.[path] ?? {}).filter((key) =>
      ["get", "post", "put", "patch", "delete"].includes(key)
    ).length,
  0
);
console.log(
  `Wrote ${outputPath}: ${paths.length} paths, ${operations} operations.`
);
