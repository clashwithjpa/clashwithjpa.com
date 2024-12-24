import type { PageServerLoad, Actions } from "./$types";
import { clanApplicationSchema } from "$lib/schema";
import { superValidate } from "sveltekit-superforms";
import { zod } from "sveltekit-superforms/adapters";
import { fail, redirect } from "@sveltejs/kit";
import { message } from "sveltekit-superforms";

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

        return message(form, "Application submitted successfully!");
    }
};
