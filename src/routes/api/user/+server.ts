import { env } from "$env/dynamic/private";
import { env as publicEnv } from "$env/dynamic/public";
import type { UserData } from "$lib/auth/user";
import { checkUser } from "$lib/discord/check";
import { userTable, type InsertUser } from "$lib/server/schema";
import { json } from "@sveltejs/kit";
import { eq, inArray } from "drizzle-orm";
import type { RequestHandler } from "./$types";

const isAdmin = (user: UserData | null) => user && user.isAdmin;

export const GET: RequestHandler = async ({ locals, url, setHeaders }) => {
    setHeaders({
        "cache-control": "max-age=6000" // 100 minutes
    });

    const user = locals.user;
    const userID = url.searchParams.get("id");

    if (!isAdmin(user)) {
        return json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!userID) {
        return json({ error: "User ID not provided" }, { status: 400 });
    }

    const userData = await checkUser(publicEnv.PUBLIC_DISCORD_URL, env.DISCORD_BOT_TOKEN, userID);
    if ("error" in userData) {
        return json({ error: true }, { status: 500 });
    }
    return json(userData);
};

export const POST: RequestHandler = async ({ locals, request }) => {
    const user = locals.user;
    const body = await request.json();

    if (!isAdmin(user)) {
        return json({ error: "Unauthorized" }, { status: 401 });
    }

    const { key, value } = body;

    if (key === "update_user") {
        const userData: InsertUser = value;
        await locals.db.update(userTable).set(userData).where(eq(userTable.discordId, userData.discordId));
    } else if (key === "remove_user") {
        const userIDs = value as string[];
        await locals.db.delete(userTable).where(inArray(userTable.discordId, userIDs));
    }

    return json({ success: true });
};
