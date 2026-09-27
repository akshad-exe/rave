import { ORPCError } from "@orpc/server";

export function unauthorized(
  message = "Unauthorized"
): ORPCError<string, unknown> {
  return new ORPCError("UNAUTHORIZED", { message });
}

export function forbidden(message = "Forbidden"): ORPCError<string, unknown> {
  return new ORPCError("FORBIDDEN", { message });
}

export function notFound(message = "Not found"): ORPCError<string, unknown> {
  return new ORPCError("NOT_FOUND", { message });
}

export function conflict(message: string): ORPCError<string, unknown> {
  return new ORPCError("CONFLICT", { message });
}

export function badRequest(message: string): ORPCError<string, unknown> {
  return new ORPCError("BAD_REQUEST", { message });
}

export function gone(message: string): ORPCError<string, unknown> {
  return new ORPCError("GONE", { message });
}

/**
 * Detects a PostgreSQL unique-constraint violation (SQLSTATE 23505).
 * Drizzle wraps pg errors in `DrizzleQueryError`, so the code may live on the
 * top-level error or its `cause`.
 */
export function isUniqueViolation(err: unknown): boolean {
  const candidates: unknown[] = [
    err,
    (err as { cause?: unknown } | null)?.cause,
  ];
  return candidates.some(
    (candidate) =>
      typeof candidate === "object" &&
      candidate !== null &&
      "code" in candidate &&
      (candidate as { code?: unknown }).code === "23505"
  );
}
