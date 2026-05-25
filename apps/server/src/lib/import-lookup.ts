export type ImportLookupEntry = { tag: string; weight: number };
export type ImportLookup = Record<string, ImportLookupEntry[]>;

const LOOKUP_PATH = `${import.meta.dir}/../../scripts/migrations/datasets/import_lookup.json`;

let cache: ImportLookup | null = null;
let loading: Promise<ImportLookup> | null = null;

async function load(): Promise<ImportLookup | null> {
    const file = Bun.file(LOOKUP_PATH);
    if (!(await file.exists())) {
        console.warn(`[import-lookup] file not found at ${LOOKUP_PATH}; account import will be a no-op until it exists`);
        return null;
    }
    return (await file.json()) as ImportLookup;
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
