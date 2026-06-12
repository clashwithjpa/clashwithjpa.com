import type { Role } from "@repo/auth-shared";

export { ROLE_LEVELS, roleLevel, ROLES, type Role } from "@repo/auth-shared";

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
            gradient: "linear-gradient(135deg, #5b21b6, #a78bfa)",
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
