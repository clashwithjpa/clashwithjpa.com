import { authClient } from "$lib/auth";
import { redirect } from "@sveltejs/kit";
import type { LayoutLoad } from "./$types";

export const load: LayoutLoad = async () => {
    const session = await authClient.getSession();

    if (!session.data?.user) {
        const signInResult = await authClient.signIn.social({ provider: "discord", callbackURL: window.location.href });
        const target = signInResult.data?.url ?? "/";
        throw redirect(303, target);
    }
};
