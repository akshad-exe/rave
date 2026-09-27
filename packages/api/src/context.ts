import type { Session } from "@rave/auth";
import type { Database } from "@rave/db";
import type { Services } from "./contract";

export interface ContextLogger {
  debug: (bindings: object, message?: string) => void;
  error: (bindings: object, message?: string) => void;
  info: (bindings: object, message?: string) => void;
  warn: (bindings: object, message?: string) => void;
}

export interface Context {
  db: Database;
  /** IP address of the incoming request (for audit logging) */
  ipAddress?: string;
  log: ContextLogger;
  services: Services;
  session: Session | null;
  /** User-Agent header (for audit logging) */
  userAgent?: string;
}

/** Context shape available to service implementations (set of fields services may depend on). */
export type ServiceContext = Omit<Context, "services">;
