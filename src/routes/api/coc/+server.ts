import type { UserData } from "$lib/auth/user";
import { cocTable } from "$lib/server/schema";
import { json } from "@sveltejs/kit";
import { eq, inArray } from "drizzle-orm";
import type { RequestHandler } from "./$types";

const isAdmin = (user: UserData | null) => user && user.isAdmin;
export const POST: RequestHandler = async ({ locals, request }) => {
    const user = locals.user;
    const body = await request.json();

    if (!isAdmin(user)) {
        return json({ error: "Unauthorized" }, { status: 401 });
    }

    const { key, value } = body;

    if (key === "remove_acc") {
        const tags = value as string[];
        await locals.db.delete(cocTable).where(inArray(cocTable.tag, tags));
    }

    if (key === "update_weight") {
        const { tag, weight } = value as { tag: string; weight: number };
        await locals.db.update(cocTable).set({ weight }).where(eq(cocTable.tag, tag));
    }

    return json({ success: true });
};
