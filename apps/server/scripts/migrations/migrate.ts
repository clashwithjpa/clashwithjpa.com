import { parse } from "csv-parse/sync";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { baseInfoTable, clanInfoTable } from "../../src/lib/db/schema";
import "dotenv/config";

if (!process.env.JPA_DATABASE_URL) throw new Error("JPA_DATABASE_URL is not set");

const pool = new Pool({
    connectionString: process.env.JPA_DATABASE_URL,
});

const db = drizzle({ client: pool });

interface BaseTableRow {
    id: string;
    code: string;
    base_link: string;
    image_link: string;
}

interface ClanTableRow {
    id: string;
    clan_code: string;
    clan_name: string;
    clan_level: string;
    clan_tag: string;
    clan_role_id: string;
    member_role_id: string;
    elder_role_id: string;
    coleader_role_id: string;
    leader_role_id: string;
    leader_id: string;
    channel_id: string;
    attacks_requirement: string;
    donations_requirement: string;
    clangames_requirement: string;
    clan_data: string;
    clan_current_war: string;
}

async function migrateBaseInfo() {
    console.log("Reading base_table.csv...");
    const csvContent = await Bun.file(import.meta.dir + "/datasets/base_table.csv").text();

    const records = parse(csvContent, {
        columns: true,
        skip_empty_lines: true,
    }) as BaseTableRow[];

    console.log(`Found ${records.length} records to migrate`);

    const values = records.map((row) => ({
        cocBaseLevel: row.code,
        cocBaseLink: row.base_link,
        cocBaseImageLink: row.image_link,
    }));

    console.log("Inserting into base_info_table...");
    await db.insert(baseInfoTable).values(values).onConflictDoNothing();
    console.log("base_info_table migration complete!");
}

async function migrateClanInfo() {
    console.log("Reading clan_table.csv...");
    const csvContent = await Bun.file(import.meta.dir + "/datasets/clan_table.csv").text();

    const records = parse(csvContent, {
        columns: true,
        skip_empty_lines: true,
    }) as ClanTableRow[];

    console.log(`Found ${records.length} records to migrate`);

    const values = records.map((row) => ({
        cocClanCode: row.clan_code,
        cocClanName: row.clan_name || null,
        cocClanLevel: row.clan_level ? parseInt(row.clan_level, 10) : null,
        cocClanTag: row.clan_tag,
        discordClanRoleId: row.clan_role_id,
        discordClanChannelId: row.channel_id,
        discordMemberRoleId: row.member_role_id,
        discordElderRoleId: row.elder_role_id,
        discordColeaderRoleId: row.coleader_role_id,
        discordLeaderRoleId: row.leader_role_id,
        discordLeaderId: row.leader_id,
        attacksRequirement: parseInt(row.attacks_requirement, 10),
        donationsRequirement: parseInt(row.donations_requirement, 10),
        clangamesRequirement: parseInt(row.clangames_requirement, 10),
        cocClanData: row.clan_data ? JSON.parse(row.clan_data) : null,
        cocClanCurrentWarData: row.clan_current_war ? JSON.parse(row.clan_current_war) : null,
    }));

    console.log("Inserting into clan_info_table...");
    await db.insert(clanInfoTable).values(values).onConflictDoNothing();
    console.log("clan_info_table migration complete!");
}

async function migrate() {
    console.log("Starting migration...\n");

    await migrateBaseInfo();
    console.log();
    await migrateClanInfo();

    console.log("\nAll migrations complete!");
    await pool.end();
}

migrate().catch((err) => {
    console.error("Migration failed:", err);
    process.exit(1);
});
