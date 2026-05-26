import { createAccessControl } from "better-auth/plugins/access";
import { defaultStatements } from "better-auth/plugins/admin/access";

// COPIED FROM ./server/src/lib/auth/permissions.ts

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
    user: ["create", "list", "get", "set-role", "ban"],
});

export const admin = ac.newRole({
    jpa: ["apply", "cwl", "review", "manage", "sudo"],
    user: ["create", "list", "get", "set-role", "ban", "delete"],
});

export const superadmin = ac.newRole({
    jpa: ["apply", "cwl", "review", "manage", "sudo", "root"],
    user: ["create", "list", "get", "update", "set-role", "ban", "impersonate", "impersonate-admins", "delete", "set-password"],
    session: ["list", "revoke", "delete"],
});
