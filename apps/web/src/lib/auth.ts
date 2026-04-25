import { PUBLIC_SERVER_URL } from "$env/static/public";
import { dashClient } from "@better-auth/infra/client";
import { adminClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/svelte";
import { ac, admin, manager, reviewer, statement, unverified, verified } from "./config/permissions";

export const authClient = createAuthClient({
    baseURL: PUBLIC_SERVER_URL,
    plugins: [
        adminClient({
            ac,
            roles: {
                admin,
                unverified,
                verified,
                reviewer,
                manager,
            },
            defaultRole: "unverified",
            adminRoles: ["admin"],
        }),
        dashClient(),
    ],
});

export async function hasPermission(userId: string | undefined, requiredPerm?: (typeof statement.jpa)[number]): Promise<boolean> {
    if (!requiredPerm) return true;
    if (!userId) return false;

    const { data: permsData, error } = await authClient.admin.hasPermission({
        userId,
        permissions: {
            jpa: [requiredPerm],
        },
    });

    return permsData?.success || false;
}
