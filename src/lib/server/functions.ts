import * as schema from "./schema";
import { asc, desc, eq } from "drizzle-orm";
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

export async function getClanPublicData(
    db: DB,
    tag: schema.SelectClan["clanTag"]
): Promise<
    Array<{
        clanTag: schema.SelectClan["clanTag"];
        clanLevel: schema.SelectClan["clanLevel"];
        attacksRequirement: schema.SelectClan["attacksRequirement"];
        donationsRequirement: schema.SelectClan["donationsRequirement"];
        clangamesRequirement: schema.SelectClan["clangamesRequirement"];
        clanData: schema.SelectClan["clanData"];
    }>
> {
    return db
        .select({
            clanTag: schema.clanTable.clanTag,
            clanLevel: schema.clanTable.clanLevel,
            attacksRequirement: schema.clanTable.attacksRequirement,
            donationsRequirement: schema.clanTable.donationsRequirement,
            clangamesRequirement: schema.clanTable.clangamesRequirement,
            clanData: schema.clanTable.clanData
        })
        .from(schema.clanTable)
        .where(eq(schema.clanTable.clanTag, tag));
}

export async function getClansPublicData(db: DB): Promise<
    Array<{
        clanTag: schema.SelectClan["clanTag"];
        clanLevel: schema.SelectClan["clanLevel"];
        attacksRequirement: schema.SelectClan["attacksRequirement"];
        donationsRequirement: schema.SelectClan["donationsRequirement"];
        clangamesRequirement: schema.SelectClan["clangamesRequirement"];
        clanData: schema.SelectClan["clanData"];
    }>
> {
    return db
        .select({
            clanTag: schema.clanTable.clanTag,
            clanLevel: schema.clanTable.clanLevel,
            attacksRequirement: schema.clanTable.attacksRequirement,
            donationsRequirement: schema.clanTable.donationsRequirement,
            clangamesRequirement: schema.clanTable.clangamesRequirement,
            clanData: schema.clanTable.clanData
        })
        .from(schema.clanTable)
        .orderBy(desc(schema.clanTable.clanLevel));
}
