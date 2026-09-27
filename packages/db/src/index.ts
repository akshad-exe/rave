import { drizzle } from "drizzle-orm/node-postgres";

import type { DatabaseConfig } from "./config";
import { relations } from "./relations";

export function createDb(env: DatabaseConfig) {
  return drizzle(env.DATABASE_URL, { relations });
}

export type Database = ReturnType<typeof createDb>;

// biome-ignore lint/performance/noBarrelFile: package entry point re-exporting schema tables
export * from "./schema/audit";
// Re-export all schema tables for convenience
export * from "./schema/auth";
export * from "./schema/community";
export * from "./schema/events";
export * from "./schema/judging";
export * from "./schema/submissions";
export * from "./schema/teams";
export * from "./schema/users";
