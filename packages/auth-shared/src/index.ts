import { createAccessControl } from "better-auth/plugins/access";
import { defaultStatements } from "better-auth/plugins/admin/access";

/*
Better-auth's default admin statements:

user: create list set-role ban impersonate impersonate-admins delete set-password get update
session: list revoke delete

We grant these explicitly per role (instead of spreading `adminAc.statements`)
so a manager can't transitively gain destructive admin powers like impersonate
or delete.
*/

/*
    We only have 1 resource, "jpa", with 6 permissions:
    - apply: Can apply to become a JPA member
    - cwl: Can apply for CWL and view CWL relevant information + ^ all the above
    - review: Can review JPA applications + ^ all the above
    - manage: Can manage JPA members (add, remove, etc) + ^ all the above
    - sudo: Can do everything admin-related, including site settings + ^ all the above
    - root: Reserved for the single superadmin (owner). Can promote/demote admins + ^ all the above
*/

export const statement = {
    ...defaultStatements,
    jpa: ["apply", "cwl", "review", "manage", "sudo", "root"],
} as const;

export const ac = createAccessControl(statement);

export const unverified = ac.newRole({
    jpa: ["apply"],
});

export const verified = ac.newRole({
    jpa: ["apply", "cwl"],
});

export const reviewer = ac.newRole({
    jpa: ["apply", "cwl", "review"],
});

export const manager = ac.newRole({
    jpa: ["apply", "cwl", "review", "manage"],
    // Read + moderate. No update/impersonate/delete/set-password and no session
    // perms. set-role and ban are further constrained by the strict-hierarchy
    // `before` hook in apps/server/src/lib/auth/index.ts.
    //
    // `list` is withheld: /admin/list-users searches and filters on `email` by
    // default, which is an enumeration oracle even with the address redacted
    // from the response. The users page reads GET /admin/users instead.
    user: ["create", "get", "set-role", "ban"],
});

export const admin = ac.newRole({
    jpa: ["apply", "cwl", "review", "manage", "sudo"],
    // Like manager + delete. Notably withheld:
    //   - `update`: `/admin/update-user` accepts arbitrary columns (banned,
    //     email, role, ...) so granting it would re-open every other guarded
    //     endpoint. Kept superadmin-only since the UI never calls it.
    //   - `set-password`: would let an admin reset the superadmin's password.
    //     Email/password auth is disabled but we keep the perm narrow as
    //     defense-in-depth.
    //   - `impersonate` / `impersonate-admins`: reserved for superadmin.
    //   - `list`: same email-oracle reason as manager.
    // No session perms.
    user: ["create", "get", "set-role", "ban", "delete"],
});

export const superadmin = ac.newRole({
    jpa: ["apply", "cwl", "review", "manage", "sudo", "root"],
    user: ["create", "list", "get", "update", "set-role", "ban", "impersonate", "impersonate-admins", "delete", "set-password"],
    session: ["list", "revoke", "delete"],
});

export const ROLES = ["unverified", "verified", "reviewer", "manager", "admin", "superadmin"] as const;
export type Role = (typeof ROLES)[number];

// Strict hierarchy used by the `before` hook in apps/server/src/lib/auth/index.ts
// to gate role mutations and destructive actions (ban / unban / remove /
// impersonate). A user can only act on another user when their own level is
// strictly greater than the target's, and can only assign roles strictly below
// their own level.
export const ROLE_LEVELS = {
    unverified: 0,
    verified: 1,
    reviewer: 2,
    manager: 3,
    admin: 4,
    superadmin: 5,
} as const satisfies Record<Role, number>;

export function roleLevel(roleStr: string | null | undefined): number {
    if (!roleStr) return ROLE_LEVELS.unverified;
    return roleStr.split(",").reduce((max, r) => Math.max(max, ROLE_LEVELS[r.trim() as Role] ?? -1), -1);
}

export type JpaPermission = (typeof statement.jpa)[number];

// API keys are scoped with the same `jpa` permissions the routes are guarded by,
// so a key's scopes can be bounded by what its owner actually holds. The role
// ladder is strictly cumulative — each role adds exactly one permission on top
// of the one below — so a level maps to a prefix of `statement.jpa`. An unknown
// role string yields `[]` rather than silently granting `apply`.
export function jpaPermsForRole(roleStr: string | null | undefined): JpaPermission[] {
    return statement.jpa.slice(0, roleLevel(roleStr) + 1);
}

// Rung of a single permission on that same ladder. -1 for anything unknown, so
// a stray scope never outranks a real one.
export function permLevel(perm: string | null | undefined): number {
    return perm ? (statement.jpa as readonly string[]).indexOf(perm) : -1;
}

// The ceiling a set of scopes grants. Because the ladder is cumulative, callers
// compare levels rather than testing membership.
export function maxPermLevel(perms: readonly string[] | null | undefined): number {
    return (perms ?? []).reduce((max, perm) => Math.max(max, permLevel(perm)), -1);
}

// Expands a ceiling into every permission it implies.
export function jpaPermsUpTo(perm: string): JpaPermission[] {
    return statement.jpa.slice(0, permLevel(perm) + 1);
}
