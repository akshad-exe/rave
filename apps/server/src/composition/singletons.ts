// Must stay first: publishes process.env into varlock's env blob for the
// compiled production image, which ships no varlock CLI to auto-load with.
import "./env-bootstrap";

import { createAuth } from "@rave/auth";
import { createDb } from "@rave/db";

import { ENV } from "../env";
import {
  createBetterAuthLogger,
  createLogger,
  createLoggerOptions,
} from "../lib/logger";

// Only development shells out to varlock to resolve .env from disk, which is
// what auto-load is for. Production is served by ./env-bootstrap and test by
// src/tests/setup.ts, both of which populate the blob without a CLI.
// The test is `=== "production"` rather than `!== "development"` on purpose:
// bare `bun run <script>` leaves NODE_ENV unset, and that path still needs
// .env resolution to work.
if (process.env.NODE_ENV !== "test" && process.env.NODE_ENV !== "production") {
  await import("varlock/auto-load");
}

export const db = createDb(ENV);
export const logger = createLogger(
  createLoggerOptions({ LOG_LEVEL: ENV.LOG_LEVEL, NODE_ENV: ENV.NODE_ENV })
);
export const auth = createAuth(
  ENV,
  db,
  [],
  createBetterAuthLogger(logger, { LOG_LEVEL: ENV.LOG_LEVEL })
);
