import { API_TOKEN, TURNSTILE_SECRET_KEY } from "$env/static/private";
import { PUBLIC_API_BASE_URI } from "$env/static/public";
import { getPlayerInfo, postVerifyToken } from "$lib/coc/player";
import { clanApplicationSchema } from "$lib/schema";
import type { DB } from "$lib/server/db";
import { type InsertClanApplication, clanApplicationTable } from "$lib/server/schema";
import { validateCFToken } from "$lib/turnstile";
import { fail, redirect } from "@sveltejs/kit";
import { message, superValidate } from "sveltekit-superforms";
import { zod } from "sveltekit-superforms/adapters";
import type { Actions, PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ locals }) => {
    const user = locals.user;
    if (!user) {
        return redirect(302, "/");
    }

    return {
        form: await superValidate(zod(clanApplicationSchema)),
        user: user
    };
};

async function createClanApplication(db: DB, data: InsertClanApplication) {
    await db.insert(clanApplicationTable).values(data);
}

export const actions: Actions = {
    default: async (event) => {
        const form = await superValidate(event, zod(clanApplicationSchema));
        if (!form.valid) {
            return fail(400, {
                form
            });
        }

        const cfToken = form.data["cf-turnstile-response"];
        const cfData = await validateCFToken(cfToken, TURNSTILE_SECRET_KEY);

        if (!cfData.success) {
            return message(form, "Invalid captcha response", {
                status: 400
            });
        }

        const playerTag = form.data.tag;
        const playerToken = form.data.apiToken;

        const playerVerifyData = await postVerifyToken(PUBLIC_API_BASE_URI, playerTag, playerToken, API_TOKEN);

        if ("reason" in playerVerifyData) {
            return message(form, "Invalid player tag or token", {
                status: 400
            });
        }

        if (playerVerifyData.status !== "ok") {
            return message(form, "Invalid player tag or token", {
                status: 400
            });
        }

        const playerData = await getPlayerInfo(PUBLIC_API_BASE_URI, playerTag, API_TOKEN);

        // await createClanApplication(event.locals.db, {
        //     tag: playerData.tag,
        //     playerData: playerData,
        //     discordId: event.locals.user?.id as string
        // });

        return message(form, "Application submitted successfully!");
    }
};
