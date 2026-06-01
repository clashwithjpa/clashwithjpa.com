#!/usr/bin/env bun
/**
 * Refresh `coc_clan_league` for every clan in `cwl_clan_info_table` by fetching
 * each clan's current war league from the Clash of Clans API.
 *
 * Run from apps/server:
 *   bun run scripts/update-cwl-leagues.ts            # apply updates
 *   bun run scripts/update-cwl-leagues.ts --dry-run  # preview only, no writes
 *
 * Reads JPA_DATABASE_URL / JPA_REDIS_URL / PUBLIC_COC_API_BASE_URI / JPA_COC_API_TOKEN
 * from .env (+ .env.server-db) via @/lib/config, same as the server.
 */
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { cwlClanInfoTable } from "@/lib/db/schema";
import { cocClient } from "@/lib/coc";
import { ClashAPIError } from "@repo/clashofclans-api";

const DRY_RUN = process.argv.includes("--dry-run");
const CONCURRENCY = 10;

async function main() {
    const clans = await db
        .select({
            tag: cwlClanInfoTable.cocClanTag,
            name: cwlClanInfoTable.cocClanName,
            league: cwlClanInfoTable.cocClanLeague,
        })
        .from(cwlClanInfoTable);

    console.log(`Found ${clans.length} clan(s)${DRY_RUN ? " — DRY RUN, no writes" : ""}\n`);

    let updated = 0;
    let unchanged = 0;
    let failed = 0;

    for (let i = 0; i < clans.length; i += CONCURRENCY) {
        const batch = clans.slice(i, i + CONCURRENCY);
        await Promise.all(
            batch.map(async (clan) => {
                try {
                    const data = await cocClient.getClan(clan.tag);
                    // Unranked clans omit warLeague (or report it as "Unranked").
                    const league = data.warLeague?.name ?? "Unranked";

                    if (league === clan.league) {
                        unchanged++;
                        return;
                    }

                    if (!DRY_RUN) {
                        await db.update(cwlClanInfoTable).set({ cocClanLeague: league }).where(eq(cwlClanInfoTable.cocClanTag, clan.tag));
                    }

                    updated++;
                    console.log(`${clan.tag}  ${clan.name}: ${clan.league}  ->  ${league}`);
                } catch (err) {
                    failed++;
                    const msg = err instanceof ClashAPIError ? `${err.status} ${err.body}` : String(err);
                    console.error(`✗ ${clan.tag}  ${clan.name}: ${msg}`);
                }
            }),
        );
    }

    console.log(`\nDone. ${updated} updated, ${unchanged} unchanged, ${failed} failed.`);
}

main()
    .catch((err) => {
        console.error(err);
        process.exitCode = 1;
    })
    .finally(async () => {
        await cocClient.destroy();
        await db.$client.end();
    });
