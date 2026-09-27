/**
 * Per-file setup — runs before each test FILE.
 *
 * Publishes the test environment into both `process.env` and varlock's env blob.
 *
 * varlock's ENV proxy only reads the blob captured when `varlock/env` is first
 * evaluated. In plain `bun vitest` runs (no `varlock run`) there is no blob, so
 * we synthesize one BEFORE any module imports `varlock/env` — otherwise
 * `ENV.*` throws "varlock ENV not initialized".
 */
import { TEST_ENV } from "./test-env";

for (const [key, value] of Object.entries(TEST_ENV)) {
  if (!process.env[key]) {
    process.env[key] = value;
  }
}

(globalThis as { __varlockLoadedEnv?: unknown }).__varlockLoadedEnv = {
  config: Object.fromEntries(
    Object.entries(TEST_ENV).map(([key, value]) => [key, { value }])
  ),
  errors: false,
  injectedAtBuild: false,
  settings: {},
};
