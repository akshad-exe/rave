import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Tests run sequentially to avoid DB conflicts between test files
    fileParallelism: false,
    globalSetup: ["src/tests/global-setup.ts"],
    hookTimeout: 30_000,
    include: ["src/**/*.test.ts"],
    pool: "forks",
    // Use a single global setup so the app and DB connection are shared
    setupFiles: ["src/tests/setup.ts"],
    // Longer timeout for DB operations
    testTimeout: 30_000,
  },
});
