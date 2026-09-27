// Load environment variables before anything else.
// In test mode, `src/tests/setup.ts` has already published the test env into
// both process.env and varlock's blob; otherwise load .env via varlock.
if (process.env.NODE_ENV !== "test") {
  await import("varlock/auto-load");
}

import { createAuth } from "@rave/auth";
import { createDb } from "@rave/db";

import { ENV } from "../env";
import {
  createBetterAuthLogger,
  createLogger,
  createLoggerOptions,
} from "../lib/logger";

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
