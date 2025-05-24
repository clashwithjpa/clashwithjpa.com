import { dev } from "$app/environment";
import { API_TOKEN, TURNSTILE_SECRET_KEY } from "$env/static/private";
import { PUBLIC_API_BASE_URI } from "$env/static/public";
import { validateCFToken } from "$lib/cf/helpers";
import { getPlayerInfo, postVerifyToken } from "$lib/coc/player";
import { clanApplicationSchema } from "$lib/schema";
import { createClanApplication, getClanApplicationFromDiscordId, getClanApplicationFromTag, isApplicationEnabled } from "$lib/server/functions";
import { type InsertClanApplication } from "$lib/server/schema";
import { redirect } from "@sveltejs/kit";
import { fail, message, superValidate } from "sveltekit-superforms";
import { zod } from "sveltekit-superforms/adapters";
import type { Actions, PageServerLoad } from "./$types";
export const load: PageServerLoad = async ({ locals }) => {
    const user = locals.user;
    if (!user) {
        return redirect(302, "/");
    }

    const enabled = await isApplicationEnabled(locals.db);
    if (!enabled) {
        return redirect(302, "/");
    }

    const applications = await getClanApplicationFromDiscordId(locals.db, user?.id as string);

    return {
        form: await superValidate(zod(clanApplicationSchema)),
        user: user,
        applications: applications
    };
};

export const actions: Actions = {
    default: async (event) => {
        const form = await superValidate(event, zod(clanApplicationSchema));
        if (!form.valid) {
            return fail(400, {
                form
            });
        }

        if (!dev) {
            const applicationEnabled = await isApplicationEnabled(event.locals.db);
            if (!applicationEnabled) {
                return message(form, "Applications are disabled", {
                    status: 400
                });
            }

            const cfToken = form.data["cf-turnstile-response"];
            const cfData = await validateCFToken(cfToken, TURNSTILE_SECRET_KEY);

            if (!cfData.success) {
                return message(form, "Invalid captcha response", {
                    status: 400
                });
            }
        }

        const playerTag = form.data.tag;

        const playerToken = form.data.apiToken;
        const playerVerifyData = await postVerifyToken(PUBLIC_API_BASE_URI, API_TOKEN, playerTag, playerToken);
        if ("status" in playerVerifyData && playerVerifyData.status !== "ok") {
            return message(form, "Invalid player tag or token", {
                status: 400
            });
        }

        const playerData = await getPlayerInfo(PUBLIC_API_BASE_URI, API_TOKEN, playerTag);

        if (!playerData) {
            return message(form, "Player not found", {
                status: 400
            });
        }

        const alreadyApplied = await getClanApplicationFromTag(event.locals.db, playerData.tag);
        if (alreadyApplied) {
            return message(form, "You have already applied to the clan", {
                status: 400
            });
        }

        const application: InsertClanApplication = {
            tag: playerData.tag,
            playerData: playerData,
            discordId: event.locals.user?.id as string
        };

        await createClanApplication(event.locals.db, application);

        return message(form, "Application submitted successfully!");
    }
};
