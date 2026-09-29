#!/usr/bin/env node
/**
 * Create apps/server/.env from .env.example, generating a real secret if one is
 * not already present.
 *
 * Idempotent: an existing .env is never overwritten, so re-running is safe and
 * never invalidates sessions that are already signed.
 */
import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const examplePath = join(root, "apps/server/.env.example");
const targetPath = join(root, "apps/server/.env");

if (existsSync(targetPath)) {
  console.log("apps/server/.env already exists — leaving it alone.");
  process.exit(0);
}

if (!existsSync(examplePath)) {
  console.error(`Missing ${examplePath}. Cannot create apps/server/.env.`);
  process.exit(1);
}

// 48 random bytes, base64: comfortably over the 32-character minimum the
// schema enforces, and a real secret rather than a shared placeholder.
const secret = randomBytes(48).toString("base64");

const contents = readFileSync(examplePath, "utf8").replace(
  /^BETTER_AUTH_SECRET=.*$/m,
  `BETTER_AUTH_SECRET=${secret}`
);

writeFileSync(targetPath, contents);
console.log("Created apps/server/.env with a generated BETTER_AUTH_SECRET.");
console.log("Next: docker compose up");
