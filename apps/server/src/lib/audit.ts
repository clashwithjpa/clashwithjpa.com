import { createHash } from "crypto";
import { db } from "@/lib/db";
import { account, auditLogTable } from "@/lib/db/schema";
import type { AppEnv } from "@/lib/types";
import * as Sentry from "@sentry/node";
import { structuredPatch } from "diff";
import { and, eq, inArray } from "drizzle-orm";
import type { Context } from "hono";
import { tryGetContext } from "hono/context-storage";

export const AUDIT_ACTIONS = [
    "clan_application.create",
    "clan_application.accepted",
    "clan_application.rejected",
    "clan_application.pending",
    "clan_application.delete",
    "clan_application.clear_accepted",
    "cwl_application.create",
    "cwl_application.assign",
    "cwl_application.unassign",
    "cwl_application.bulk_assign",
    "cwl_application.bulk_unassign",
    "cwl_application.bulk_delete",
    "cwl_application.update_notes",
    "cwl_bonus.tick",
    "cwl_bonus.untick",
    "cwl_season.create",
    "cwl_season.rename",
    "cwl_season.delete",
    "settings.update",
    "cwl_ping.settings_update",
    "cwl_ping.manual_run",
    "rules.update",
    "privacy.update",
    "clan.create",
    "clan.update",
    "clan.delete",
    "cwl_clan.create",
    "cwl_clan.update",
    "cwl_clan.delete",
    "cwl_clan.sync_leagues",
    "coc_account.create",
    "coc_account.import",
    "coc_account.stats_update",
    "coc_account.weight_update",
    "coc_account.mark_main",
    "coc_account.mark_external",
    "coc_account.sync",
    "coc_account.sync_war_weights",
    "coc_account.delete",
    "coc_account.bulk_delete",
    "user.role_set",
    "user.create",
    "user.update",
    "user.ban",
    "user.unban",
    "user.remove",
    "user.password_set",
    "user.session_revoked",
    "user.sessions_revoked",
    "user.impersonate",
    "user.impersonate_stop",
    "user.api_access_granted",
    "user.api_access_revoked",
    "user.usernames_refreshed",
    "api_key.create",
    "api_key.update",
    "api_key.delete",
] as const;

export const AUDIT_TARGET_TYPES = [
    "clan_application",
    "cwl_application",
    "cwl_bonus",
    "cwl_season",
    "settings",
    "rules",
    "privacy",
    "clan",
    "cwl_clan",
    "coc_account",
    "user",
    "api_key",
] as const;

export const AUDIT_ENTITY_TYPES = ["user", "coc_account", "clan", "cwl_clan", "cwl_season", "api_key", "discord_channel"] as const;

export const AUDIT_SOURCES = ["web", "api"] as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[number];
export type AuditTargetType = (typeof AUDIT_TARGET_TYPES)[number];
export type AuditEntityType = (typeof AUDIT_ENTITY_TYPES)[number];
export type AuditSource = (typeof AUDIT_SOURCES)[number];

// A thing the event touched. Modelled on the actor / targets split of WorkOS
// and Retraced audit events: the row's targetType/Id is the primary target,
// subjects are everything else a reader needs (the applicant behind an
// application, the owner of an account...).
//
// Entities are references, never copies. Names, avatars, roles, town halls and
// clan names all live in their own tables and are resolved on read, so they're
// always current. One that no longer exists falls back to its id (a user
// renders as a ghost).
export type AuditEntity = {
    type: AuditEntityType;
    // Better Auth user id for users, the tag for accounts and clans, the row id
    // for everything else.
    id: string | null;
    // Users only, when no user id could be resolved (an applicant who has since
    // unlinked): the Discord id is then the only key we have.
    discordId?: string | null;
    // What the entity was to this event: "target", "applicant", "owner"...
    relation?: string;
};

// A value inside a change that points at another entity, resolved on read like subjects.
export type AuditRef = { ref: AuditEntityType; id: string };

export type AuditValue = string | number | boolean | null | string[] | AuditRef;

// Discord's audit log shape: one entry per changed key. `before` absent means
// the field was set on create, `after` absent means it went away on delete.
// Unlike references, these values are history and can't be derived later.
export type AuditChange = { field: string; before?: AuditValue; after?: AuditValue };

// One row of a bulk action. `owner` is the member behind it, when it has one.
export type AuditItem = { entity: AuditEntity; owner?: AuditEntity; changes?: AuditChange[] };

export type AuditContext = {
    userAgent: string | null;
    requestId: string | null;
    method: string | null;
    path: string | null;
    impersonatorId?: string | null;
};

export type LogActionInput = {
    action: AuditAction;
    targetType?: AuditTargetType;
    targetId?: string | number | null;
    subjects?: AuditEntity[];
    changes?: AuditChange[];
    items?: AuditItem[];
    // Small extras only: counts, flags, short identifiers. Large text belongs in
    // a diff summary (see textDiff), never as a raw copy.
    metadata?: Record<string, unknown>;
    // For updates: drop the entry when the diff came back empty, so re-saving
    // an unchanged form doesn't add noise to the log.
    onlyIfChanged?: boolean;
};

export type AuditActor = { id?: string | null } | null | undefined;

// The key an action was performed through, when it came in over the API rather
// than a browser session. Its name is kept because a revoked key's row is
// deleted, and the entry must still say which key it was.
type AuditApiKey = { id?: string | null; name?: string | null } | null | undefined;

// Bulk actions can touch thousands of rows. Past this the entry keeps the count
// in metadata.itemsTotal and drops the rest, so one click can't write a megabyte.
const MAX_ITEMS = 100;

export function userEntity(u: { id?: string | null; discordId?: string | null }, relation?: string): AuditEntity {
    return { type: "user", id: u.id ?? null, discordId: u.id ? undefined : (u.discordId ?? undefined), relation };
}

export function entity(type: AuditEntityType, id: string | number, relation?: string): AuditEntity {
    return { type, id: String(id), relation };
}

export function ref(type: AuditEntityType, id: string | number | null | undefined): AuditRef | null {
    return id == null ? null : { ref: type, id: String(id) };
}

function normalizeValue(v: unknown): AuditValue {
    if (v === undefined || v === null) return null;
    if (v instanceof Date) return v.toISOString();
    if (Array.isArray(v)) return v.map(String);
    if (typeof v === "object") return v as AuditRef;
    return v as string | number | boolean;
}

const sameValue = (a: AuditValue, b: AuditValue) => JSON.stringify(a) === JSON.stringify(b);

// Field-level diff of two row snapshots. Pass null for `before` on create and
// null for `after` on delete. `map` turns raw ids into refs.
export function diffFields<B extends object, A extends object, K extends (keyof A | keyof B) & string>(
    before: B | null | undefined,
    after: A | null | undefined,
    fields: readonly K[],
    map: Partial<Record<K, (v: unknown) => AuditValue>> = {},
): AuditChange[] {
    const out: AuditChange[] = [];
    for (const field of fields) {
        const fmt = (v: unknown) => (v == null ? null : (map[field] ?? normalizeValue)(v));
        const b = before ? fmt((before as Record<string, unknown>)[field]) : undefined;
        const a = after ? fmt((after as Record<string, unknown>)[field]) : undefined;
        if (before && after && sameValue(b ?? null, a ?? null)) continue;
        if (!before && a == null) continue;
        if (!after && b == null) continue;
        out.push({ field, ...(before ? { before: b } : {}), ...(after ? { after: a } : {}) });
    }
    return out;
}

const MAX_PATCH_LINES = 400;
const MAX_PATCH_LINE_LENGTH = 400;

const shortHash = (s: string) => createHash("sha256").update(s).digest("hex").slice(0, 12);

// For long text (rules, privacy policy) we keep a capped line diff instead of
// either copy, so an admin can see what changed without the log storing the
// whole document twice per edit.
export function textDiff(before: string | null, after: string): { changes: AuditChange[]; metadata: Record<string, unknown> } {
    const prev = before ?? "";
    const patch = structuredPatch("before", "after", prev, after, "", "", { context: 2 });
    let added = 0;
    let removed = 0;
    let budget = MAX_PATCH_LINES;
    const hunks = [];
    for (const h of patch.hunks) {
        for (const line of h.lines) {
            if (line.startsWith("+")) added++;
            else if (line.startsWith("-")) removed++;
        }
        if (budget <= 0) continue;
        const lines = h.lines.slice(0, budget).map((l) => (l.length > MAX_PATCH_LINE_LENGTH ? `${l.slice(0, MAX_PATCH_LINE_LENGTH)}…` : l));
        budget -= lines.length;
        hunks.push({ oldStart: h.oldStart, oldLines: h.oldLines, newStart: h.newStart, newLines: h.newLines, lines });
    }
    const countLines = (s: string) => (s ? s.split("\n").length : 0);
    return {
        changes: [
            { field: "length", before: prev.length, after: after.length },
            { field: "lineCount", before: countLines(prev), after: countLines(after) },
        ],
        metadata: {
            linesAdded: added,
            linesRemoved: removed,
            hashBefore: before == null ? null : shortHash(prev),
            hashAfter: shortHash(after),
            hunks,
            truncated: budget <= 0,
        },
    };
}

function requestContext(c: Context<AppEnv> | undefined): AuditContext | null {
    if (!c) return null;
    return {
        userAgent: c.req.header("user-agent")?.slice(0, 512) ?? null,
        requestId: c.get("requestId") ?? null,
        method: c.req.method,
        path: c.req.path,
        impersonatorId: c.get("session")?.impersonatedBy ?? null,
    };
}

// Subjects may name a user by Discord id only (applications store that). Swap
// in the user id where one exists, so "every event involving X" can match on a
// single key. One query, and only when needed.
async function resolveDiscordIds(entities: AuditEntity[]): Promise<AuditEntity[]> {
    const discordIds = [...new Set(entities.flatMap((e) => (e.type === "user" && !e.id && e.discordId ? [e.discordId] : [])))];
    if (discordIds.length === 0) return entities;
    const rows = await db
        .select({ id: account.userId, discordId: account.accountId })
        .from(account)
        .where(and(eq(account.providerId, "discord"), inArray(account.accountId, discordIds)));
    const byDiscord = new Map(rows.map((r) => [r.discordId, r.id]));
    return entities.map((e) => {
        const id = e.type === "user" && !e.id && e.discordId ? byDiscord.get(e.discordId) : undefined;
        return id ? { ...e, id, discordId: undefined } : e;
    });
}

const stripUndefined = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

async function insertAuditLog(actor: AuditActor, input: LogActionInput, apiKey: AuditApiKey, context: AuditContext | null) {
    const items = input.items ?? [];
    const subjects = input.subjects ?? [];
    const keptItems = items.slice(0, MAX_ITEMS);

    // One pass over subjects, items and their owners together.
    const owners = keptItems.flatMap((i) => (i.owner ? [i.owner] : []));
    const resolved = await resolveDiscordIds([...subjects, ...keptItems.map((i) => i.entity), ...owners]);
    let ownerIndex = subjects.length + keptItems.length;
    const resolvedItems = keptItems.map((item, i) => ({
        ...item,
        entity: resolved[subjects.length + i]!,
        ...(item.owner ? { owner: resolved[ownerIndex++]! } : {}),
    }));
    const resolvedSubjects = resolved.slice(0, subjects.length);

    const metadata = { ...(input.metadata ?? {}), ...(items.length > MAX_ITEMS ? { itemsTotal: items.length } : {}) };

    await db.insert(auditLogTable).values({
        actorId: actor?.id ?? null,
        action: input.action,
        targetType: input.targetType ?? null,
        targetId: input.targetId != null ? String(input.targetId) : null,
        subjects: resolvedSubjects.length ? stripUndefined(resolvedSubjects) : null,
        changes: input.changes?.length ? stripUndefined(input.changes) : null,
        items: resolvedItems.length ? stripUndefined(resolvedItems) : null,
        context: context ? stripUndefined(context) : null,
        metadata: Object.keys(metadata).length ? stripUndefined(metadata) : null,
        source: apiKey ? "api" : "web",
        apiKeyId: apiKey?.id ?? null,
        apiKeyName: apiKey?.name ?? null,
    });
}

// Fire-and-forget. The insert runs off the request path; failures go to Sentry
// and never break the user-facing request.
function dispatch(actor: AuditActor, input: LogActionInput, apiKey: AuditApiKey, context: AuditContext | null): void {
    if (input.onlyIfChanged && !input.changes?.length && !input.items?.length) return;
    insertAuditLog(actor, input, apiKey, context).catch((err) => {
        Sentry.captureException(err, { tags: { audit_action: input.action } });
    });
}

// Every mutating route calls this, so API-driven mutations are audited and
// tagged with no per-route change: the key is read straight off the context.
export function logAction(c: Context<AppEnv>, input: LogActionInput): void {
    dispatch(c.get("user"), input, c.get("apiKey"), requestContext(c));
}

// For callers without a Hono context in hand (the better-auth hooks). Always
// "web": API keys are denied on /api/auth/* before the handler runs.
export function logActionForActor(actor: AuditActor, input: LogActionInput): void {
    dispatch(actor, input, null, requestContext(tryGetContext<AppEnv>()));
}
