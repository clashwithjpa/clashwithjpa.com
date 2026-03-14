export const ROLES = ["unverified", "verified", "reviewer", "manager", "admin"] as const;

export type Role = (typeof ROLES)[number];

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
        label: "Member",
        decoration: {
            gradient: "linear-gradient(135deg, #44403c, #78716c)",
            animated: false,
        },
    },
    verified: {
        label: "Verified",
        decoration: {
            gradient: "linear-gradient(135deg, #1e3a8a, #3b82f6)",
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
            gradient: "linear-gradient(135deg, #7f1d1d, #ef4444)",
            animated: false,
        },
    },
    admin: {
        label: "Admin",
        decoration: {
            gradient: "conic-gradient(from 0deg, #4c1d95, #a78bfa, #4c1d95)",
            animated: true,
        },
    },
};
