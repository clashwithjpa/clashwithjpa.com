import { db } from "@/lib/db";
import { auditLogTable } from "@/lib/db/schema";
import type { AppEnv } from "@/lib/types";
import * as Sentry from "@sentry/bun";
import type { Context } from "hono";

export const AUDIT_ACTIONS = [
    "clan_application.create",
    "clan_application.accepted",
    "clan_application.rejected",
    "clan_application.pending",
    "cwl_application.create",
    "cwl_application.assign",
    "cwl_application.unassign",
    "cwl_application.bulk_assign",
    "cwl_application.bulk_unassign",
    "cwl_application.bulk_delete",
    "settings.update",
    "rules.update",
    "clan.create",
    "clan.update",
    "clan.delete",
    "cwl_clan.create",
    "cwl_clan.update",
    "cwl_clan.delete",
    "cwl_clan.sync_leagues",
    "coc_account.create",
    "coc_account.import",
    "coc_account.weight_update",
    "coc_account.external_update",
    "coc_account.mark_external",
    "coc_account.delete",
    "user.role_set",
    "user.create",
    "user.update",
    "user.ban",
    "user.unban",
    "user.remove",
    "user.password_set",
    "user.session_revoked",
    "user.sessions_revoked",
] as const;

export const AUDIT_TARGET_TYPES = ["clan_application", "cwl_application", "settings", "rules", "clan", "cwl_clan", "coc_account", "user"] as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[number];

export type AuditTargetType = (typeof AUDIT_TARGET_TYPES)[number];

export type LogActionInput = {
    action: AuditAction;
    targetType?: AuditTargetType;
    targetId?: string | number | null;
    // Keep metadata small: identifying labels (tags, codes), changed field names, or final boolean values.
    // Never store large text (rules content, full row snapshots, etc.).
    metadata?: Record<string, unknown>;
};

export type AuditActor = { id?: string | null; name?: string | null } | null | undefined;

function insertAuditLog(actor: AuditActor, input: LogActionInput): void {
    db.insert(auditLogTable)
        .values({
            actorId: actor?.id ?? null,
            actorName: actor?.name ?? null,
            action: input.action,
            targetType: input.targetType ?? null,
            targetId: input.targetId != null ? String(input.targetId) : null,
            metadata: input.metadata ?? null,
        })
        .catch((err) => {
            Sentry.captureException(err, { tags: { audit_action: input.action } });
        });
}

// Fire-and-forget audit insert. Failures are reported to Sentry but never thrown,
// so a failing audit insert can't break the user-facing request.
export function logAction(c: Context<AppEnv>, input: LogActionInput): void {
    insertAuditLog(c.get("user"), input);
}

// For callers without a Hono context (e.g. better-auth hooks).
export function logActionForActor(actor: AuditActor, input: LogActionInput): void {
    insertAuditLog(actor, input);
}
