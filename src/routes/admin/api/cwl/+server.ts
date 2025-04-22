import { isAdmin } from "$lib/auth/user";
import { cwlTable, type InsertCWL } from "$lib/server/schema";
import { json } from "@sveltejs/kit";
import { eq, inArray } from "drizzle-orm";
import type { RequestHandler } from "./$types";

export const POST: RequestHandler = async ({ locals, request, fetch }) => {
    const admin = await isAdmin(fetch);
    const body = await request.json();

    if (!admin) {
        return json({ error: "Unauthorized" }, { status: 401 });
    }

    const { key, value } = body;

    if (key === "delete_application") {
        const playerTags = value as string[];
        await locals.db.delete(cwlTable).where(inArray(cwlTable.accountTag, playerTags));
    } else if (key === "update_application") {
        const cwlData: InsertCWL = value;
        cwlData.appliedAt = new Date(cwlData.appliedAt ?? "");
        await locals.db.update(cwlTable).set(cwlData).where(eq(cwlTable.accountTag, cwlData.accountTag));
    }
    return json({ success: true });
};
