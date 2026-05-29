import { authClient, hasPermission } from "$lib/auth";
import { statement } from "@repo/auth-shared";
import { redirect } from "@sveltejs/kit";
import type { LayoutLoad } from "./$types";

export const load: LayoutLoad = async () => {
    const session = await authClient.getSession();
    const user = session.data?.user;

    if (!user) {
        const signInResult = await authClient.signIn.social({ provider: "discord", callbackURL: window.location.href });
        const target = signInResult.data?.url ?? "/";
        throw redirect(303, target);
    }

    const permsToCheck = statement.jpa;
    const permissionsEntries = await Promise.all(permsToCheck.map(async (perm) => [perm, await hasPermission(user.id, perm)] as const));
    const permissions = Object.fromEntries(permissionsEntries) as Record<string, boolean>;

    return { permissions };
};
