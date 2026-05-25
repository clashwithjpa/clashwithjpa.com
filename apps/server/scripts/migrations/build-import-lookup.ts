interface CocRow {
    id: number;
    user_id: string;
    tag: string;
    weight: number;
}

interface UserRow {
    id: number;
    discord_id: string;
    is_active: boolean;
}

type Lookup = Record<string, { tag: string; weight: number }[]>;

async function build() {
    const datasetsDir = import.meta.dir + "/datasets";

    const [cocRows, userRows] = await Promise.all([
        Bun.file(`${datasetsDir}/coc_table.json`).json() as Promise<CocRow[]>,
        Bun.file(`${datasetsDir}/user_table.json`).json() as Promise<UserRow[]>,
    ]);

    const activeDiscordIds = new Set<string>();
    for (const u of userRows) {
        if (u.is_active) activeDiscordIds.add(u.discord_id);
    }

    const lookup: Lookup = {};
    let skipped = 0;
    for (const row of cocRows) {
        if (!activeDiscordIds.has(row.user_id)) {
            skipped++;
            continue;
        }
        (lookup[row.user_id] ??= []).push({ tag: row.tag, weight: row.weight });
    }

    const outputPath = `${datasetsDir}/import_lookup.json`;
    await Bun.write(outputPath, JSON.stringify(lookup, null, 2));

    console.log(`Active discord users: ${activeDiscordIds.size}`);
    console.log(`Coc rows imported:    ${cocRows.length - skipped}`);
    console.log(`Coc rows skipped:     ${skipped} (inactive or unknown user)`);
    console.log(`Discord users in lookup: ${Object.keys(lookup).length}`);
    console.log(`Wrote ${outputPath}`);
}

build().catch((err) => {
    console.error("Build failed:", err);
    process.exit(1);
});
