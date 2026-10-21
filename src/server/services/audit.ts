import { getDb } from "../db";
import { adminAuditLogs } from "../db/schema";

export type AuditEntry = {
  actorId: string | null;
  action: string;
  entityType: string;
  entityId?: string | number | null;
  result?: "success" | "denied" | "error";
  meta?: Record<string, unknown>;
};

/** Records an administrative action. Never put passwords, tokens or full contact data in meta. */
export async function audit(entry: AuditEntry) {
  const db = await getDb();
  await db.insert(adminAuditLogs).values({
    actorId: entry.actorId,
    action: entry.action,
    entityType: entry.entityType,
    entityId: entry.entityId == null ? null : String(entry.entityId),
    result: entry.result ?? "success",
    meta: entry.meta ?? null,
  });
}
