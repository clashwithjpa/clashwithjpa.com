import type { UserData } from "$lib/auth/user";
import { acceptApplication, deleteApplication, rejectApplication } from "$lib/server/functions";
import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

const isAdmin = (user: UserData | null) => user && user.isAdmin;

export const POST: RequestHandler = async ({ locals, request, params, url }) => {
    console.log(`Received application update reques`);

    const user = locals.user;
    const body = await request.json();
    const tag = decodeURIComponent(params.tag);

    if (!isAdmin(user)) {
        return json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log(`User ${user?.username} is updating application with tag ${tag} to status ${body.status}`);

    if (body.status === "accepted") {
        await acceptApplication(locals.db, tag, body.discordId);
    } else if (body.status === "rejected") {
        await rejectApplication(locals.db, tag);
    } else if (body.status === "deleted") {
        await deleteApplication(locals.db, tag, body.discordId);
    }

    console.log(`Application with tag ${tag} updated to status ${body.status} by user ${user?.username}`);

    return json({ success: true });
};
