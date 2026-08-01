import { auth } from "@lib/auth";
import { statement, type JpaPermission } from "@repo/auth-shared";

/**
 * A route guard, paired with the `jpa` permission it checks.
 *
 * The permission is carried on the function rather than left implicit in its
 * name so `hasAccessAuthMiddleware` can reuse it as the required *scope* for
 * API-key requests — a key must hold the same permission the route demands,
 * independently of what its owner's role grants.
 */
export type AuthCheckFn = ((userId: string | null | undefined) => Promise<{ success: boolean }>) & {
    perm: JpaPermission;
};

function permissionCheck(perm: JpaPermission): AuthCheckFn {
    const check = async (userId: string | null | undefined) => {
        if (!userId)
            return {
                error: null,
                success: false,
            };
        return await auth.api.userHasPermission({
            body: {
                userId: userId,
                permissions: {
                    jpa: [perm],
                },
            },
        });
    };
    check.perm = perm;
    return check;
}

export const isAuthenticated = permissionCheck("apply");
export const isVerified = permissionCheck("cwl");
export const isReviewer = permissionCheck("review");
export const isManager = permissionCheck("manage");
export const isAdmin = permissionCheck("sudo");
export const isSuperadmin = permissionCheck("root");

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
