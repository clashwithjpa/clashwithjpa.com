import { dev } from "$app/environment";
import { env } from "$env/dynamic/private";
import { env as publicEnv } from "$env/dynamic/public";
import { validateCFToken } from "$lib/cf/helpers";
import { getPlayerInfo } from "$lib/coc/player";
import { cwlApplicationSchema } from "$lib/schema";
import {
    getClanNames,
    getCWLApplicationByTag,
    getCWLApplications,
    getCWLClans,
    getUserAccounts,
    insertCWLApplication,
    isCWLEnabled
} from "$lib/server/functions";
import type { InsertCWL } from "$lib/server/schema";
import { redirect, error } from "@sveltejs/kit";
import { fail, message, superValidate } from "sveltekit-superforms";
import { zod } from "sveltekit-superforms/adapters";
import type { Actions, PageServerLoad } from "./$types";

export const load = (async ({ locals }) => {
    const user = locals.user;
    if (!user) {
        console.error("Login to fillout the CWL Form");
        return redirect(302, "/");
    }

    const enabled = await isCWLEnabled(locals.db);
    const applications = await getCWLApplications(locals.db, user.id);
    if (!enabled && applications.length <= 0) {
        return redirect(302, "/cwl/list");
    }

    const userAccount = await getUserAccounts(locals.db, user.id);
    if (!userAccount) {
        console.error("Apply to join a clan first");
        return redirect(302, "/apply");
    }

    if (!userAccount.isActive) {
        console.error("Your account not found");
        return redirect(302, "/");
    }

    return {
        form: await superValidate(zod(cwlApplicationSchema)),
        user: user,
        cwlEnabled: enabled,
        userAccount: userAccount,
        cwlClans: await getCWLClans(locals.db),
        cocData: Promise.all(userAccount.cocAccounts.map((account) => getPlayerInfo(publicEnv.PUBLIC_API_BASE_URI, env.API_TOKEN, account.tag))),
        applications: applications,
        clanNames: await getClanNames(locals.db)
    };
}) satisfies PageServerLoad;

export const actions: Actions = {
    default: async (event) => {
        const form = await superValidate(event, zod(cwlApplicationSchema));
        if (!form.valid) {
            return fail(400, {
                form
            });
        }

        if (!dev) {
            const cwlEnabled = await isCWLEnabled(event.locals.db);
            if (!cwlEnabled) {
                return message(form, "Applications are disabled", {
                    status: 400
                });
            }

            const cfToken = form.data["cf-turnstile-response"];
            const cfData = await validateCFToken(cfToken, env.TURNSTILE_SECRET_KEY);

            if (!cfData.success) {
                return message(form, "Invalid captcha response", {
                    status: 400
                });
            }
        }

        try {
            const isAlt = form.data.isAlt;

            const [month, year] = new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" }).split(" ");
            const playerTag = form.data.tag;

            const existingApplication = await getCWLApplicationByTag(event.locals.db, playerTag, month, parseInt(year));
            if (existingApplication) {
                return message(form, "You have already applied for this month", {
                    status: 400
                });
            }

            const playerData = await getPlayerInfo(publicEnv.PUBLIC_API_BASE_URI, env.API_TOKEN, playerTag);
            if (!playerData) {
                return message(form, "Player not found", {
                    status: 400
                });
            }

            let playerAccountWeight: number | undefined = 1;
            let playerClanName: string | undefined = "";

            if (isAlt) {
                if (!form.data.accountClan) {
                    return message(form, "Please select a clan", {
                        status: 400
                    });
                }
                playerAccountWeight = form.data.accountWeight;
                playerClanName = form.data.accountClan;
            } else {
                const playerClanName_ = playerData.clan?.name;
                playerClanName = playerClanName_;

                const userAccount = await getUserAccounts(event.locals.db, event.locals.user!.id);
                const cocAccount = userAccount?.cocAccounts.find((a) => a.tag === playerTag);

                if (!cocAccount) {
                    return message(form, "Account not linked", {
                        status: 400
                    });
                }

                playerAccountWeight = cocAccount.weight;
            }

            if (!playerAccountWeight || playerAccountWeight < 10000) {
                return message(form, "Low account weight :/. Apply again later", {
                    status: 400
                });
            }

            const cwlApplication: InsertCWL = {
                userId: event.locals.user?.id as string,
                userName: event.locals.user?.username as string,
                accountName: playerData.name,
                accountTag: playerData.tag,
                accountClan: playerClanName as string,
                accountWeight: playerAccountWeight !== undefined ? playerAccountWeight : 1,
                month: month,
                year: year as unknown as number,
                preferenceNum: form.data.preferenceNum
            };

            await insertCWLApplication(event.locals.db, cwlApplication);

            return message(form, "Application submitted successfully!");
        } catch (e) {
            console.error(e);
            return error(500, "Something went wrong");
        }
    }
};
