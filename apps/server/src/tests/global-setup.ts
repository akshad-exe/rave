/**
 * Global setup — runs ONCE before all test files.
 *
 * Applies migrations to the test database, then truncates every table so the
 * suite is hermetic (event lists, counts, and duplicate checks don't leak state
 * between runs).
 *
 * Uses the programmatic migrator rather than `drizzle-kit migrate`: the CLI
 * loads varlock, which needs a real `.env` and is not available in the test
 * sandbox.
 */
import { createDb } from "@rave/db";
import { runMigrations } from "@rave/db/migrate";
import { sql } from "drizzle-orm";

import { TEST_DATABASE_URL } from "./test-env";

export async function setup() {
  console.log("\n[test] Applying migrations to rave_test...");
  await runMigrations(TEST_DATABASE_URL);
  console.log("[test] Migrations applied.");

  const testDb = createDb({ DATABASE_URL: TEST_DATABASE_URL });
  await testDb.execute(
    sql.raw(`
      DO $$
      DECLARE r RECORD;
      BEGIN
        FOR r IN (
          SELECT tablename
          FROM pg_tables
          WHERE schemaname = 'public' AND tablename <> '__drizzle_migrations'
        ) LOOP
          EXECUTE format('TRUNCATE TABLE %I RESTART IDENTITY CASCADE', r.tablename);
        END LOOP;
      END $$;
    `)
  );
  console.log("[test] Test database cleaned.");
}

export function teardown() {
  // Keep the test database for post-run inspection
}
