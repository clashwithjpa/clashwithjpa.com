import { dev } from "$app/environment";
import { API_TOKEN, TURNSTILE_SECRET_KEY } from "$env/static/private";
import { PUBLIC_API_BASE_URI } from "$env/static/public";
import { validateCFToken } from "$lib/cf/helpers";
import { getFWAStats } from "$lib/coc/fwa";
import { getPlayerInfo } from "$lib/coc/player";
import { cwlApplicationSchema } from "$lib/schema";
import { getClanNames, getCWLApplicationByTag, getCWLApplications, getUserAccounts, insertCWLApplication, isCWLEnabled } from "$lib/server/functions";
import type { InsertCWL } from "$lib/server/schema";
import { redirect } from "@sveltejs/kit";
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
    if (!enabled) {
        return redirect(302, "/");
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

    const applications = await getCWLApplications(locals.db, user.id);

    return {
        form: await superValidate(zod(cwlApplicationSchema)),
        user: user,
        userAccount: userAccount,
        cocData: Promise.all(userAccount.cocAccounts.map((account) => getPlayerInfo(PUBLIC_API_BASE_URI, API_TOKEN, account.tag))),
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
            const cfData = await validateCFToken(cfToken, TURNSTILE_SECRET_KEY);

            if (!cfData.success) {
                return message(form, "Invalid captcha response", {
                    status: 400
                });
            }
        }

        const isAlt = form.data.isAlt;

        const [month, year] = new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" }).split(" ");
        const playerTag = form.data.tag;

        const existingApplication = await getCWLApplicationByTag(event.locals.db, playerTag, month, parseInt(year));
        if (existingApplication) {
            return message(form, "You have already applied for this month", {
                status: 400
            });
        }

        const playerData = await getPlayerInfo(PUBLIC_API_BASE_URI, API_TOKEN, playerTag);
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
            const playerClanTag = playerData.clan!.tag;
            playerClanName = playerData.clan!.name;
            const fwaStats = await getFWAStats(playerClanTag as string);
            const fwaStatsMember = "error" in fwaStats ? undefined : fwaStats[playerTag];

            if (!fwaStatsMember) {
                return message(form, "You are not in the FWA clan", {
                    status: 400
                });
            }

            playerAccountWeight = fwaStatsMember.weight;
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
    }
};
