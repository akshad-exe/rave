import { randomBytes } from "node:crypto";

/** Generate a URL-safe random ID */
export function generateId(prefix?: string): string {
  const raw = randomBytes(16).toString("base64url");
  return prefix ? `${prefix}_${raw}` : raw;
}

/** Generate a secure random token (e.g. for invitations) */
export function generateToken(): string {
  return randomBytes(32).toString("base64url");
}
