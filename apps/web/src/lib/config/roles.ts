export const ROLES = ["unverified", "verified", "reviewer", "manager", "admin", "superadmin"] as const;

export type Role = (typeof ROLES)[number];

// Strict hierarchy: a user can only change another user's role when their own
// level is strictly greater than both the target's current level and the role
// being assigned. Must stay in sync with apps/server/src/lib/auth/permissions.ts.
export const ROLE_LEVELS: Record<Role, number> = {
    unverified: 0,
    verified: 1,
    reviewer: 2,
    manager: 3,
    admin: 4,
    superadmin: 5,
};

export function roleLevel(role: string | null | undefined): number {
    if (!role) return ROLE_LEVELS.unverified;
    return role.split(",").reduce((max, r) => Math.max(max, ROLE_LEVELS[r.trim() as Role] ?? -1), -1);
}

export interface RoleDecoration {
    gradient: string;
    animated: boolean;
}

export interface RoleConfig {
    label: string;
    decoration: RoleDecoration;
}

export const ROLE_CONFIG: Record<Role, RoleConfig> = {
    unverified: {
        label: "Unverified",
        decoration: {
            gradient: "linear-gradient(135deg, #44403c, #78716c)",
            animated: false,
        },
    },
    verified: {
        label: "Verified",
        decoration: {
            gradient: "linear-gradient(135deg, #166534, #4ade80)",
            animated: false,
        },
    },
    reviewer: {
        label: "Reviewer",
        decoration: {
            gradient: "linear-gradient(135deg, #78350f, #d97706)",
            animated: false,
        },
    },
    manager: {
        label: "Manager",
        decoration: {
            gradient: "linear-gradient(135deg, #1e40af, #3b82f6)",
            animated: false,
        },
    },
    admin: {
        label: "Admin",
        decoration: {
            gradient: "conic-gradient(from 0deg, #f59e0b, #fde68a, #b45309, #fde68a, #f59e0b)",
            animated: true,
        },
    },
    superadmin: {
        label: "Superadmin",
        decoration: {
            gradient: "conic-gradient(from 0deg, #ef4444, #fca5a5, #7f1d1d, #fca5a5, #ef4444)",
            animated: true,
        },
    },
};
