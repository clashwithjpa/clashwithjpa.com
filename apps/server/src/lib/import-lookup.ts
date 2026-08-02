import { readFile } from "fs/promises";

export type ImportLookupEntry = { tag: string; weight: number };
export type ImportLookup = Record<string, ImportLookupEntry[]>;

const LOOKUP_PATH = `${import.meta.dirname}/../../scripts/migrations/datasets/import_lookup.json`;

let cache: ImportLookup | null = null;
let loading: Promise<ImportLookup> | null = null;

async function load(): Promise<ImportLookup | null> {
    try {
        return JSON.parse(await readFile(LOOKUP_PATH, "utf8")) as ImportLookup;
    } catch (err) {
        if ((err as NodeJS.ErrnoException).code === "ENOENT") {
            console.warn(`[import-lookup] file not found at ${LOOKUP_PATH}; account import will be a no-op until it exists`);
            return null;
        }
        throw err;
    }
}

export async function getImportLookup(): Promise<ImportLookup> {
    if (cache) return cache;
    if (loading) return loading;
    loading = load()
        .then((data) => {
            if (data) cache = data;
            return data ?? {};
        })
        .finally(() => {
            loading = null;
        });
    return loading;
}

export async function getImportableAccounts(discordUserId: string): Promise<ImportLookupEntry[]> {
    const lookup = await getImportLookup();
    return lookup[discordUserId] ?? [];
}
