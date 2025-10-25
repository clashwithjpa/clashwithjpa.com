import { cwlClanFormSchema } from "$lib/coc/schema";
import { getAdminConfig, getCWLClans } from "$lib/server/functions";
import { fail, message, superValidate } from "sveltekit-superforms";
import { zod } from "sveltekit-superforms/adapters";
import type { PageServerLoad } from "./$types";

export const load = (async ({ locals }) => {
    const adminConfig = await getAdminConfig(locals.db);
    const clans = await getCWLClans(locals.db);

    return {
        form: await superValidate(zod(cwlClanFormSchema)),
        clans,
        guildID: adminConfig.guildId
    };
}) satisfies PageServerLoad;

export const actions = {
    default: async (event) => {
        const form = await superValidate(event, zod(cwlClanFormSchema));
        if (!form.valid) {
            return fail(400, { form });
        }
        const resp = await event.fetch("/api/clans", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ key: "add_cwl_clan", value: form.data })
        });
        if (!resp.ok) {
            const data: { error: string } = await resp.json();
            return message(form, data.error, { status: 400 });
        }
        return message(form, "Added CWL clan");
    }
};
