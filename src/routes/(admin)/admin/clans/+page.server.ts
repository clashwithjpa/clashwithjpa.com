import { clanFormSchema } from "$lib/coc/schema";
import { getClansPublicData } from "$lib/server/functions";
import type { Actions } from "@sveltejs/kit";
import { fail, message, superValidate } from "sveltekit-superforms";
import { zod } from "sveltekit-superforms/adapters";
import type { PageServerLoad } from "./$types";
import type { APIClan } from "$lib/coc/types";

export const load = (async ({ locals }) => {
    const clans = await getClansPublicData(locals.db);

    return { form: await superValidate(zod(clanFormSchema)), clans };
}) satisfies PageServerLoad;

export const actions: Actions = {
    default: async (event) => {
        const form = await superValidate(event, zod(clanFormSchema));
        if (!form.valid) {
            return fail(400, { form });
        }

        const resp = await event.fetch("/api/clans", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ key: "add_clan", value: form.data })
        });

        if (!resp.ok) {
            const data: { error: string } = await resp.json();
            return message(form, data.error, { status: 400 });
        }

        const data: APIClan = await resp.json();
        return message(form, `Added clan ${data.name}`);
    }
};
