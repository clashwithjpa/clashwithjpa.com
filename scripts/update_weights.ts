import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { eq, sql } from "drizzle-orm";
import pg from "pg";
import { cocTable, clanTable } from "../src/lib/server/schema.js";

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL! });
const db = drizzle(pool);

interface FWAStatsMember {
    tag: string;
    name: string;
    weight: number;
}

async function fetchClanWeights(clanTag: string): Promise<FWAStatsMember[]> {
    const tag = clanTag.replace("#", "");
    const resp = await fetch(`https://fwastats.com/Clan/${tag}/Members.json`, {
        headers: {
            "User-Agent":
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36",
        },
    });

    if (!resp.ok) {
        console.log(`[!] ${clanTag} fetch failed (${resp.status})`);
        return [];
    }

    return (await resp.json()) as FWAStatsMember[];
}

async function main() {
    const clans = await db.select({ clanTag: clanTable.clanTag }).from(clanTable);
    console.log(`${clans.length} clans loaded`);

    let updated = 0;
    let skipped = 0;

    for (const clan of clans) {
        const members = await fetchClanWeights(clan.clanTag);

        if (!members.length) {
            console.log(`[skip] ${clan.clanTag} - no data`);
            continue;
        }

        console.log(`${clan.clanTag} - ${members.length} members`);

        const result = await db.transaction(async (tx) => {
            const updates = members.map((m) =>
                tx.update(cocTable).set({ weight: m.weight }).where(eq(cocTable.tag, m.tag))
            );
            return Promise.all(updates);
        });

        for (const r of result) {
            if (r.rowCount && r.rowCount > 0) updated++;
            else skipped++;
        }
    }

    console.log(`\ndone — ${updated} updated, ${skipped} skipped`);
    await pool.end();
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
