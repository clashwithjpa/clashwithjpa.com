import { API_TOKEN, DISCORD_BOT_TOKEN } from "$env/static/private";
import { PUBLIC_API_BASE_URI, PUBLIC_DISCORD_URL } from "$env/static/public";
import { getPlayerInfo } from "$lib/coc/player";
import { checkUser } from "$lib/discord/check";
import { customCWLEntrySchema } from "$lib/schema";
import { getAllCWLApplications, getClanNames, getCWLApplicationByTag, getCWLClans, insertCWLApplication } from "$lib/server/functions";
import type { InsertCWL } from "$lib/server/schema";
import { fail, message, superValidate } from "sveltekit-superforms";
import { zod } from "sveltekit-superforms/adapters";
import type { Actions, PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ locals }) => {
    const cwlApplications = await getAllCWLApplications(locals.db);
    const clanNames = await getClanNames(locals.db);
    const cwlClans = await getCWLClans(locals.db);

    return { cwlApplications, clanNames, cwlClans, form: await superValidate(zod(customCWLEntrySchema)) };
};

export const actions: Actions = {
    default: async (event) => {
        const form = await superValidate(event, zod(customCWLEntrySchema));
        if (!form.valid) {
            return fail(400, {
                form
            });
        }

        const [month, year] = new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" }).split(" ");
        const playerTag = form.data.tag;

        const existingApplication = await getCWLApplicationByTag(event.locals.db, playerTag, month, parseInt(year));
        if (existingApplication) {
            return message(form, `An application already exists with player tag ${playerTag}`, {
                status: 400
            });
        }

        const userID = form.data.userId;
        const userData = await checkUser(PUBLIC_DISCORD_URL, DISCORD_BOT_TOKEN, userID);
        if ("error" in userData) {
            return message(form, "User not found", {
                status: 400
            });
        }
        const playerData = await getPlayerInfo(PUBLIC_API_BASE_URI, API_TOKEN, playerTag);
        if (!playerData) {
            return message(form, "Player not found", {
                status: 400
            });
        }
        const playerClanName = form.data.accountClan;
        const playerAccountWeight = form.data.accountWeight;

        const cwlApplication: InsertCWL = {
            userId: userID,
            userName: userData.username,
            accountName: playerData.name,
            accountTag: playerData.tag,
            accountClan: playerClanName as string,
            accountWeight: playerAccountWeight,
            month: month,
            year: year as unknown as number,
            preferenceNum: form.data.preferenceNum
        };

        await insertCWLApplication(event.locals.db, cwlApplication);

        return message(form, "Added CWL Application");
    }
};
