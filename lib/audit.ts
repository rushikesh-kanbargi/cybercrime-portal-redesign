// Thin wrapper around AuditLog inserts (§18.2, §22.2). Narrative contents
// are never passed through here — callers only ever pass ids and codes.

import { db } from "@/lib/db";
import { auditLogs } from "@/lib/db/schema";

export async function writeAudit(entry: {
  actorType: "citizen" | "system" | "police_mock";
  actorId?: string | null;
  action: string;
  targetType: string;
  targetId: string;
  ipHash?: string | null;
  metadata?: Record<string, unknown>;
}) {
  await db.insert(auditLogs).values({
    actorType: entry.actorType,
    actorId: entry.actorId ?? null,
    action: entry.action,
    targetType: entry.targetType,
    targetId: entry.targetId,
    ipHash: entry.ipHash ?? null,
    metadata: entry.metadata ?? null,
  });
}
