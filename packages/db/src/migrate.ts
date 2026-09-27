import { existsSync } from "node:fs";
import { join } from "node:path";

import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";

const MIGRATIONS_RELATIVE_PATH = "packages/db/src/migrations";

const MIGRATION_MAX_ATTEMPTS = 30;
const MIGRATION_RETRY_DELAY_MS = 2000;

/** Network errors that mean "not ready yet" rather than "misconfigured". */
const TRANSIENT_ERROR_CODES = new Set([
  "EAI_AGAIN",
  "ECONNREFUSED",
  "ECONNRESET",
  "ENOTFOUND",
  "ETIMEDOUT",
  "EPIPE",
]);

function isTransientError(error: unknown): boolean {
  if (typeof error !== "object" || error === null) {
    return false;
  }
  const { code, cause } = error as { code?: string; cause?: unknown };
  if (code && TRANSIENT_ERROR_CODES.has(code)) {
    return true;
  }
  return isTransientError(cause);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function* range(length: number): Generator<number> {
  for (const index of Array.from({ length }, (_, i) => i)) {
    yield index;
  }
}

/**
 * Locates the Drizzle migrations folder.
 *
 * The server bundles `@rave/db` into `apps/server/dist`, so the migrations
 * cannot be resolved relative to this module. Resolve from the workspace
 * layout instead: the repository root when running locally, and the
 * still-present `/app` tree inside the runtime image.
 */
function resolveMigrationsFolder(): string {
  const candidates = [
    process.env.MIGRATIONS_FOLDER,
    join(process.cwd(), "..", "..", MIGRATIONS_RELATIVE_PATH),
    join("/app", MIGRATIONS_RELATIVE_PATH),
  ].filter((candidate): candidate is string => Boolean(candidate));

  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }

  throw new Error(
    `Could not locate Drizzle migrations. Set MIGRATIONS_FOLDER to the folder containing migration subdirectories. Looked in:\n${candidates.join("\n")}`
  );
}

/**
 * Applies pending Drizzle migrations.
 *
 * The runtime image is Node-only and has no drizzle-kit, so migrations are
 * applied through drizzle-orm's programmatic migrator. Safe to run on every
 * boot: drizzle records applied migrations in `drizzle.__drizzle_migrations`
 * and skips them.
 *
 * Retries transient failures because the container can start before the
 * database's DNS entry and TCP listener are both ready.
 */
export async function runMigrations(
  databaseUrl: string,
  log: (message: string) => void = () => undefined
): Promise<void> {
  const migrationsFolder = resolveMigrationsFolder();
  const applyMigrations = () =>
    migrate(drizzle(databaseUrl), { migrationsFolder });

  for (const attempt of range(MIGRATION_MAX_ATTEMPTS)) {
    try {
      // Retries must be sequential: each attempt depends on the previous one failing.
      // biome-ignore lint/performance/noAwaitInLoops: sequential retry is the point
      await applyMigrations();
      return;
    } catch (error) {
      const isLastAttempt = attempt === MIGRATION_MAX_ATTEMPTS - 1;
      if (isLastAttempt || !isTransientError(error)) {
        throw error;
      }
      const attemptNumber = attempt + 1;
      log(
        `database not ready (attempt ${attemptNumber}/${MIGRATION_MAX_ATTEMPTS}), retrying in ${MIGRATION_RETRY_DELAY_MS}ms`
      );
      await sleep(MIGRATION_RETRY_DELAY_MS);
    }
  }
}
