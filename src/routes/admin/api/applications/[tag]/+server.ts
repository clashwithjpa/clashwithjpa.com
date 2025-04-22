import { isAdmin } from "$lib/auth/user";
import { acceptApplication, deleteApplication, rejectApplication } from "$lib/server/functions";
import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

export const POST: RequestHandler = async ({ locals, request, params, fetch }) => {
    const admin: boolean = await isAdmin(fetch);
    const body = await request.json();
    const tag = decodeURIComponent(params.tag);

    if (!admin) {
        return json({ error: "Unauthorized" }, { status: 401 });
    }

    if (body.status === "accepted") {
        await acceptApplication(locals.db, tag, body.discordId);
    } else if (body.status === "rejected") {
        await rejectApplication(locals.db, tag);
    } else if (body.status === "deleted") {
        await deleteApplication(locals.db, tag, body.discordId);
    }

    return json({ success: true });
};
