import { PUBLIC_SERVER_URL } from "$app/env/public";
import { apiKeyClient } from "@better-auth/api-key/client";
import { ac, admin, manager, reviewer, statement, superadmin, unverified, verified } from "@repo/auth-shared";
import { adminClient, inferAdditionalFields } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/svelte";

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

    const { data: permsData } = await authClient.admin.hasPermission({
        userId,
        permissions: {
            jpa: [requiredPerm],
        },
    });

    return permsData?.success || false;
}

// Shared with the /auth/popup page, which reports back on this channel.
export const AUTH_POPUP_CHANNEL = "jpa:auth-popup";
export type AuthPopupMessage = { type: "signed-in" } | { type: "error"; error: string };

function popupFeatures() {
    const width = 500;
    const height = 750;
    const left = Math.round(window.screenX + (window.outerWidth - width) / 2);
    const top = Math.round(window.screenY + (window.outerHeight - height) / 2);
    return `popup,width=${width},height=${height},left=${left},top=${top}`;
}

/**
 * Discord sign-in in a popup (a new tab on phones) so the page you're on stays put.
 * Better Auth's documented `disableRedirect` hands back the provider URL instead of
 * navigating, and we open it ourselves. When the popup is blocked, this falls back to
 * the normal full-page redirect.
 *
 * Call it straight from a click handler: the window is opened before any await,
 * because browsers only allow popups during the user's gesture.
 */
export async function signInWithDiscord() {
    const returnTo = window.location.href;
    const popup = window.open("", "jpa-discord-sign-in", popupFeatures());
    if (!popup) return authClient.signIn.social({ provider: "discord", callbackURL: returnTo });

    // The provider's pages can sever window.opener, so the callback page reports over a
    // BroadcastChannel instead of postMessage. If a phone suspends this tab and the message
    // is missed, Better Auth still refetches the session when the tab regains focus.
    const channel = new BroadcastChannel(AUTH_POPUP_CHANNEL);
    channel.onmessage = (event: MessageEvent<AuthPopupMessage>) => {
        channel.close();
        if (event.data.type === "signed-in") authClient.useSession().get().refetch();
    };

    const landing = `${window.location.origin}/auth/popup`;
    const { data, error } = await authClient.signIn.social({
        provider: "discord",
        callbackURL: landing,
        errorCallbackURL: landing,
        disableRedirect: true,
    });
    if (error || !data?.url) {
        channel.close();
        popup.close();
        return;
    }
    popup.location.href = data.url;
}
