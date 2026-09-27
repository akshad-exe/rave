/**
 * Single source of truth for the test database connection.
 *
 * The suite talks to a dedicated `rave_test` database so it can truncate every
 * table between runs without touching development data. `docker compose` creates
 * that database on first boot, and `POSTGRES_PASSWORD` keeps the credentials in
 * sync with the compose stack. `TEST_DATABASE_URL` overrides both.
 */
export const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ??
  `postgresql://postgres:${process.env.POSTGRES_PASSWORD ?? "password"}@localhost:5432/rave_test`;

/**
 * Values the app reads through varlock's generated `ENV` proxy during tests.
 *
 * The suite does not run under `varlock run`, so the proxy has no env blob to
 * read. `setup.ts` publishes these into the blob before any module imports it,
 * which keeps tests working without a gitignored `.env.test` file.
 */
export const TEST_ENV = {
  BETTER_AUTH_SECRET:
    process.env.BETTER_AUTH_SECRET ??
    "rave-test-secret-not-for-production-use-0123456789",
  BETTER_AUTH_URL: "http://localhost:3000",
  CORS_ORIGIN: "http://localhost:3001",
  DATABASE_URL: TEST_DATABASE_URL,
  LOG_LEVEL: "error",
  NODE_ENV: "test",
} as const;
