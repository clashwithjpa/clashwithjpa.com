import * as schema from "./schema";
import { eq } from "drizzle-orm";
import type { NeonQueryFunction } from "@neondatabase/serverless";
import type { NeonHttpDatabase } from "drizzle-orm/neon-http";

type DB = NeonHttpDatabase<Record<string, never>> & {
    $client: NeonQueryFunction<false, false>;
};

export async function createClanApplication(db: DB, data: schema.InsertClanApplication) {
    await db.insert(schema.clanApplicationTable).values(data);
}

export async function getClanApplicationFromTag(db: DB, tag: schema.SelectClanApplication["tag"]): Promise<Array<{ tag: string }>> {
    return db.select({ tag: schema.clanApplicationTable.tag }).from(schema.clanApplicationTable).where(eq(schema.clanApplicationTable.tag, tag));
}
