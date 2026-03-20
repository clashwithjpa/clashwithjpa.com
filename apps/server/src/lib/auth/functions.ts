import { auth } from "@lib/auth";
import { statement } from "@lib/auth/permissions";

export async function isAuthenticated(userId: string | null | undefined) {
    if (!userId)
        return {
            error: null,
            success: false,
        };
    return await auth.api.userHasPermission({
        body: {
            userId: userId,
            permissions: {
                jpa: ["apply"],
            },
        },
    });
}

export async function isVerified(userId: string | null | undefined) {
    if (!userId)
        return {
            error: null,
            success: false,
        };
    return await auth.api.userHasPermission({
        body: {
            userId: userId,
            permissions: {
                jpa: ["cwl"],
            },
        },
    });
}

export async function isReviewer(userId: string | null | undefined) {
    if (!userId)
        return {
            error: null,
            success: false,
        };
    return await auth.api.userHasPermission({
        body: {
            userId: userId,
            permissions: {
                jpa: ["review"],
            },
        },
    });
}

export async function isManager(userId: string | null | undefined) {
    if (!userId)
        return {
            error: null,
            success: false,
        };
    return await auth.api.userHasPermission({
        body: {
            userId: userId,
            permissions: {
                jpa: ["manage"],
            },
        },
    });
}

export async function isAdmin(userId: string | null | undefined) {
    if (!userId)
        return {
            error: null,
            success: false,
        };
    return await auth.api.userHasPermission({
        body: {
            userId: userId,
            role: "admin",
            permissions: {
                jpa: ["sudo"],
            },
        },
    });
}

export async function hasPermission(
    userId: string | null | undefined,
    permission: (typeof statement.jpa)[number] | Array<(typeof statement.jpa)[number]>,
) {
    if (!userId)
        return {
            error: null,
            success: false,
        };
    const permissions = Array.isArray(permission) ? permission : [permission];
    return await auth.api.userHasPermission({
        body: {
            userId: userId,
            permissions: {
                jpa: permissions,
            },
        },
    });
}
