import type Badge from "$lib/components/ui/Badge.svelte";
import { ROLE_DETAILS } from "$lib/components/ui/RoleBadge.svelte";
import { maxPermLevel, statement, type JpaPermission } from "@repo/auth-shared";
import type { Component, ComponentProps } from "svelte";
import TablerWorld from "~icons/tabler/world";

/**
 * The access levels a key can be given.
 *
 * A level is a rung of the role ladder: a key at `manage` reaches what a Manager
 * reaches and no further. Label, colour and icon come from `ROLE_DETAILS` so a
 * level reads the same here, on `/admin/users`, and on Scalar's badge. `apply`
 * is the one rung no role is named after, so it takes the name the API reference
 * gives those endpoints, `Public`.
 *
 * Levels are cumulative, so a description lists only what its own rung adds.
 * `writes` drives the create form's warning and has to track what the routes at
 * that level really do. Reviewer counts: accepting an application is a write.
 */
export const SCOPE_LABELS: Record<
    JpaPermission,
    { label: string; variant: ComponentProps<typeof Badge>["variant"]; icon: Component; description: string; writes: boolean }
> = {
    apply: {
        label: "Public",
        variant: "ghost",
        icon: TablerWorld,
        description: "Clan, player, war and CWL lookups, plus the rules page.",
        writes: false,
    },
    cwl: {
        ...ROLE_DETAILS.verified,
        description: "Clan, player, war and CWL lookups, plus the rules page.",
        writes: false,
    },
    review: {
        ...ROLE_DETAILS.reviewer,
        description: "Join applications, including accepting and rejecting them, and the site analytics.",
        writes: true,
    },
    manage: {
        ...ROLE_DETAILS.manager,
        description: "CWL rosters, bonuses and war weights, the member list, the audit log and the rules page.",
        writes: true,
    },
    sudo: {
        ...ROLE_DETAILS.admin,
        description: "Creating and deleting clans, seasons and CoC accounts, plus site settings.",
        writes: true,
    },
    root: {
        ...ROLE_DETAILS.superadmin,
        description: "Everything your own account can do, with no restrictions.",
        writes: true,
    },
};

/**
 * The levels the create form offers.
 *
 * `cwl` is left out: every route gated on it is a personal account page, none of
 * which a key can reach, so a `cwl` key and an `apply` key open the same doors.
 * It keeps its `SCOPE_LABELS` entry because existing keys can still sit there.
 * Put it back if a verified-only endpoint ever becomes key-reachable.
 */
export const SELECTABLE_SCOPES = statement.jpa.filter((perm) => perm !== "cwl") as JpaPermission[];

// One entry of the `apiKeys` array better-auth's api-key plugin wraps in the
// paginated envelope returned by `authClient.apiKey.list()`.
// Typed structurally rather than imported so this module stays usable from
// components that never touch the auth client.
export type ApiKeyRow = {
    id: string;
    name: string | null;
    start: string | null;
    prefix: string | null;
    enabled: boolean;
    requestCount: number;
    remaining: number | null;
    rateLimitMax: number | null;
    rateLimitTimeWindow: number | null;
    lastRequest: Date | string | null;
    expiresAt: Date | string | null;
    createdAt: Date | string;
    permissions?: Record<string, string[]> | null;
};

export function keyScopes(apiKey: ApiKeyRow): JpaPermission[] {
    return (apiKey.permissions?.jpa ?? []) as JpaPermission[];
}

/**
 * The single level a key reaches — the highest rung of its stored scopes.
 * Reading the ceiling rather than the list keeps keys minted outside this UI
 * rendering correctly, whatever combination they hold.
 */
export function keyLevel(apiKey: ApiKeyRow): JpaPermission | null {
    const level = maxPermLevel(keyScopes(apiKey));
    return level < 0 ? null : (statement.jpa[level] as JpaPermission);
}

/** The scopes a level implies, lowest first. */
export function scopesUpTo(level: JpaPermission): JpaPermission[] {
    return statement.jpa.slice(0, statement.jpa.indexOf(level) + 1) as JpaPermission[];
}

/**
 * A recognisable stand-in for a key we can never show again.
 *
 * `start` is the leading fragment the plugin stores precisely so a key can be
 * identified in a list without retaining the secret. When it isn't stored, fall
 * back to the prefix alone rather than inventing digits.
 */
export function maskedKey(apiKey: ApiKeyRow): string {
    if (apiKey.start) return `${apiKey.start}${"•".repeat(8)}`;
    return `${apiKey.prefix ?? "jpa_"}${"•".repeat(8)}`;
}

export const STATUS_CLASS_COLORS: Record<string, string> = {
    "2xx": "#22c55e",
    "3xx": "#3b82f6",
    "4xx": "#eab308",
    "429": "#f97316",
    "5xx": "#ef4444",
};
