import { auditLog } from "@rave/db";
import type { ServiceContext } from "./context";
import { generateId } from "./id";

export interface AuditOptions {
  action: string;
  eventId?: string;
  metadata?: Record<string, unknown>;
  resourceId?: string;
  resourceType: string;
}

/**
 * Write a non-blocking audit log entry.
 * Never throws — a failed audit write must not fail the operation.
 * Never include passwords/tokens in metadata.
 */
export async function writeAudit(
  context: ServiceContext,
  opts: AuditOptions
): Promise<void> {
  try {
    await context.db.insert(auditLog).values({
      action: opts.action,
      actorId: context.session?.user?.id,
      actorRole: (context as unknown as { userRole?: string }).userRole,
      eventId: opts.eventId,
      id: generateId("aud"),
      ipAddress: context.ipAddress,
      metadata: opts.metadata ?? {},
      resourceId: opts.resourceId,
      resourceType: opts.resourceType,
      userAgent: context.userAgent,
    });
  } catch (err) {
    context.log.error({ err }, "audit write failed");
  }
}
