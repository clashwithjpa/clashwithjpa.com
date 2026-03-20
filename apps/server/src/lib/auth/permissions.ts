import { createAccessControl } from "better-auth/plugins/access";
import { defaultStatements, adminAc } from "better-auth/plugins/admin/access";

/*
By default, there are two resources with up to six permissions.

user: create list set-role ban impersonate delete set-password
session: list revoke delete
*/

/*
    We only have 1 resource, "jpa", with 5 permissions:
    - apply: Can apply to become a JPA member
    - cwl: Can apply for CWL and view CWL relevant information + ^ all the above
    - review: Can review JPA applications + ^ all the above
    - manage: Can manage JPA members (add, remove, etc) + ^ all the above
    - sudo: Can do everything, including managing everyone + ^ all the above
*/

export const statement = {
    ...defaultStatements,
    jpa: ["apply", "cwl", "review", "manage", "sudo"],
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
});

export const admin = ac.newRole({
    jpa: ["apply", "cwl", "review", "manage", "sudo"],
    ...adminAc.statements,
});
