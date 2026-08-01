import { PUBLIC_SERVER_URL } from "$env/static/public";
import { apiKeyClient } from "@better-auth/api-key/client";
import { adminClient, inferAdditionalFields } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/svelte";
import { ac, admin, manager, reviewer, statement, superadmin, unverified, verified } from "@repo/auth-shared";

export const authClient = createAuthClient({
    baseURL: PUBLIC_SERVER_URL,
    plugins: [
        inferAdditionalFields({
            user: {
                discordUsername: { type: "string" },
                apiAccess: { type: "boolean" },
            },
        }),
        // Key CRUD (create / list / update / delete) goes through this rather
        // than the generated client — it's better-auth's own /api/auth/api-key/*
        // surface. Only the usage analytics live on our Hono routes.
        apiKeyClient(),
        adminClient({
            ac,
            roles: {
                admin,
                unverified,
                verified,
                reviewer,
                manager,
                superadmin,
            },
            defaultRole: "unverified",
            adminRoles: ["superadmin"],
        }),
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
