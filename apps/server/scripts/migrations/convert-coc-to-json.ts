import { parse } from "csv-parse/sync";

interface CocTableRow {
    id: string;
    user_id: string;
    tag: string;
    weight: string;
}

async function convertCocTableToJson() {
    console.log("Reading coc_table.csv...");
    const csvContent = await Bun.file(import.meta.dir + "/datasets/coc_table.csv").text();

    const records = parse(csvContent, {
        columns: true,
        skip_empty_lines: true,
    }) as CocTableRow[];

    console.log(`Found ${records.length} records`);

    const jsonData: Record<string, { tag: string; weight: number }[]> = {};

    for (const row of records) {
        if (!jsonData[row.user_id]) {
            jsonData[row.user_id] = [];
        }
        jsonData[row.user_id].push({
            tag: row.tag,
            weight: parseInt(row.weight, 10),
        });
    }

    const outputPath = import.meta.dir + "/datasets/coc_table.json";
    await Bun.write(outputPath, JSON.stringify(jsonData, null, 2));

    console.log(`Converted to JSON: ${outputPath}`);
}

convertCocTableToJson().catch((err) => {
    console.error("Conversion failed:", err);
    process.exit(1);
});
