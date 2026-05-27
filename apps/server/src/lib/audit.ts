import type { Context } from "hono";
import * as Sentry from "@sentry/bun";
import { db } from "@/lib/db";
import { auditLogTable } from "@/lib/db/schema";
import type { AppEnv } from "@/lib/types";

export type AuditAction =
    // Clan join applications
    | "clan_application.create"
    | "clan_application.accepted"
    | "clan_application.rejected"
    | "clan_application.pending"
    // CWL applications
    | "cwl_application.create"
    | "cwl_application.assign"
    | "cwl_application.unassign"
    // Settings
    | "settings.update"
    | "rules.update"
    // JPA clans
    | "clan.create"
    | "clan.update"
    | "clan.delete"
    // CWL clans
    | "cwl_clan.create"
    | "cwl_clan.update"
    | "cwl_clan.delete"
    // COC account links
    | "coc_account.import";

export type AuditTargetType = "clan_application" | "cwl_application" | "settings" | "rules" | "clan" | "cwl_clan" | "coc_account";

export type LogActionInput = {
    action: AuditAction;
    targetType?: AuditTargetType;
    targetId?: string | number | null;
    // Keep metadata small: identifying labels (tags, codes), changed field names, or final boolean values.
    // Never store large text (rules content, full row snapshots, etc.).
    metadata?: Record<string, unknown>;
};

// Fire-and-forget audit insert. Failures are reported to Sentry but never thrown,
// so a failing audit insert can't break the user-facing request.
export function logAction(c: Context<AppEnv>, input: LogActionInput): void {
    const user = c.get("user");
    const actorId = user?.id ?? null;
    const actorName = user?.name ?? null;

    db.insert(auditLogTable)
        .values({
            actorId,
            actorName,
            action: input.action,
            targetType: input.targetType ?? null,
            targetId: input.targetId != null ? String(input.targetId) : null,
            metadata: input.metadata ?? null,
        })
        .catch((err) => {
            Sentry.captureException(err, { tags: { audit_action: input.action } });
        });
}
