import type { PageServerLoad, Actions } from "./$types";
import { clanApplicationSchema } from "$lib/schema";
import { superValidate } from "sveltekit-superforms";
import { zod } from "sveltekit-superforms/adapters";
import { fail, redirect } from "@sveltejs/kit";
import { message } from "sveltekit-superforms";
import type { PlayerRoot } from "$lib/clans/types";
import { type InsertClanApplication, clanApplicationTable } from "$lib/server/schema";
import type { DB } from "$lib/server/db";

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

async function createUser(db: DB, data: InsertClanApplication) {
    await db.insert(clanApplicationTable).values(data);
}

export const actions: Actions = {
    default: async (event) => {
        const form = await superValidate(event, zod(clanApplicationSchema));
        console.log(form);
        if (!form.valid) {
            return fail(400, {
                form
            });
        }

        const cfToken = form.data["cf-turnstile-response"];
        const cfResponse = await event.fetch(`/api/verifyToken?token=${cfToken}`);
        const cfData = await cfResponse.json();

        if (!cfData.success) {
            return message(form, "Invalid captcha response", {
                status: 400
            });
        }

        const playerTag = form.data.tag;
        const playerToken = form.data.apiToken;

        const verifyPlayerToken = await event.fetch(`/api/verifyToken?tag=${encodeURIComponent(playerTag)}&token=${playerToken}`, {
            method: "POST"
        });
        
        const verifyPlayerData = await verifyPlayerToken.json();
        if (!verifyPlayerData.success) {
            return message(form, "Invalid player tag", {
                status: 400
            });
        }

        const playerData = await event.fetch(`/api/player/${encodeURIComponent(playerTag)}`);
        if (!playerData.ok) {
            return message(form, "Invalid player tag", {
                status: 400
            });
        }
        const player = (await playerData.json()) as PlayerRoot;

        await createUser(event.locals.db, {
            tag: player.tag,
            playerData: player,
            discordId: event.locals.user?.id as string
        });

        return message(form, "Application submitted successfully!");
    }
};
