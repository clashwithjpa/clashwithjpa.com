<script lang="ts">
    import { PUBLIC_SERVER_URL } from "$env/static/public";
    import Toolbar from "$lib/components/Toolbar.svelte";
    import Button from "$lib/components/ui/Button.svelte";
    import Dialog from "$lib/components/ui/Dialog.svelte";
    import Grid from "$lib/components/ui/Grid.svelte";
    import Input from "$lib/components/ui/Input.svelte";
    import Seo from "$lib/components/ui/Seo.svelte";
    import { fadeIn } from "$lib/utils/animations";
    import { getAdminCocAccounts, syncCocAccounts, updateCocAccountExternal, updateCocAccountWarWeight } from "@repo/clashofclans-client";
    import type { GridApi, IDatasource, IGetRowsParams } from "ag-grid-community";
    import { toast } from "svelte-sonner";
    import TablerCopy from "~icons/tabler/copy";
    import TablerRefresh from "~icons/tabler/refresh";
    import TablerSearch from "~icons/tabler/search";

    type SyncResult = {
        updated: number;
        skipped: number;
        notLinked: { tag: string; name: string }[];
        notInSheet: { cocAccountTag: string; ownerName: string | null }[];
    };

    let gridApi: GridApi | null = $state(null);
    let searchText = $state("");
    let syncDialogOpen = $state(false);
    let sheetUrl = $state("");
    let syncResult = $state<SyncResult | null>(null);
    let syncResultOpen = $state(false);

    function createDatasource(): IDatasource {
        return {
            async getRows(params: IGetRowsParams) {
                try {
                    const offset = params.startRow || 0;
                    const limit = (params.endRow || 0) - offset;
                    const sort = params.sortModel?.[0];

                    const resp = await getAdminCocAccounts(
                        { limit, offset, search: searchText || undefined, sortBy: sort?.colId, sortDir: sort?.sort },
                        { baseURL: PUBLIC_SERVER_URL, credentials: "include" },
                    );

                    if (!resp.success) {
                        params.failCallback();
                        return;
                    }

                    params.successCallback(resp.data.accounts, resp.data.total);
                } catch (error) {
                    toast.error("Failed to load COC accounts", { description: error instanceof Error ? error.message : "An unknown error occurred" });
                    params.failCallback();
                }
            },
        };
    }

    function handleSearchChange() {
        gridApi?.setGridOption("datasource", createDatasource());
    }

    async function handleSync() {
        if (!sheetUrl.trim()) {
            toast.error("Paste a Google Sheet URL first");
            return;
        }
        try {
            // The fetch client returns the parsed body even on 4xx, so handle the error shape too.
            const resp = (await syncCocAccounts(
                { sheetUrl: sheetUrl.trim() },
                { baseURL: PUBLIC_SERVER_URL, credentials: "include", headers: { "Content-Type": "application/json" } },
            )) as { success: true; data: SyncResult } | { success: false; error: string | Record<string, unknown> };
            if (!resp.success) throw new Error(typeof resp.error === "string" ? resp.error : "Sheet could not be read");
            syncResult = resp.data;
            syncResultOpen = true;
            sheetUrl = "";
            gridApi?.setGridOption("datasource", createDatasource());
        } catch (error) {
            toast.error("Sync failed", {
                description: error instanceof Error && error.message ? error.message : "Make sure the sheet is link-viewable",
            });
            // Dialog auto-closes on confirm; reopen so the URL can be fixed and retried.
            syncDialogOpen = true;
        }
    }

    async function copyList(rows: { name: string; tag: string }[]) {
        const text = rows.map((r) => `${r.name} ${r.tag}`.trim()).join("\n");
        try {
            await navigator.clipboard.writeText(text);
            toast.success(`Copied ${rows.length} row${rows.length === 1 ? "" : "s"}`);
        } catch {
            toast.error("Couldn't copy to clipboard");
        }
    }

    const formatNumber = (p: { value: unknown }) => (p.value != null ? Number(p.value).toLocaleString() : "");
</script>

<Seo title="COC Accounts" description="View linked Clash of Clans accounts and manage their war weights." />

<div class="relative flex size-full flex-col overflow-hidden" in:fadeIn>
    <Grid
        gridOptions={{
            rowHeight: 56,
            rowModelType: "infinite",
            cacheBlockSize: 50,
            blockLoadDebounceMillis: 300,
            onGridReady: (params) => {
                gridApi = params.api;
                gridApi.setGridOption("datasource", createDatasource());
            },
            onCellValueChanged: async (event) => {
                if (event.oldValue === event.newValue) return;

                if (event.colDef.field === "warWeight") {
                    const warWeight = Number(event.newValue);
                    if (!Number.isInteger(warWeight) || warWeight < 0) {
                        toast.error("War weight must be a non-negative whole number");
                        event.data.warWeight = event.oldValue;
                        event.api.refreshCells({ rowNodes: [event.node], force: true });
                        return;
                    }

                    try {
                        const resp = await updateCocAccountWarWeight(
                            event.data.id,
                            { warWeight },
                            { baseURL: PUBLIC_SERVER_URL, credentials: "include", headers: { "Content-Type": "application/json" } },
                        );
                        if (resp.success) {
                            event.data.warWeight = resp.data.account.warWeight;
                            event.api.refreshCells({ rowNodes: [event.node], force: true });
                            toast.success(`War weight updated for ${event.data.cocAccountTag}`);
                        } else {
                            throw new Error();
                        }
                    } catch (error) {
                        toast.error("Failed to update war weight", { description: error instanceof Error ? error.message : undefined });
                        event.data.warWeight = event.oldValue;
                        event.api.refreshCells({ rowNodes: [event.node], force: true });
                    }
                    return;
                }

                if (event.colDef.field === "isExternal") {
                    const isExternal = Boolean(event.newValue);
                    try {
                        const resp = await updateCocAccountExternal(
                            event.data.id,
                            { isExternal },
                            { baseURL: PUBLIC_SERVER_URL, credentials: "include", headers: { "Content-Type": "application/json" } },
                        );
                        if (resp.success) {
                            event.data.isExternal = resp.data.account.isExternal;
                            event.api.refreshCells({ rowNodes: [event.node], force: true });
                            toast.success(`${event.data.cocAccountTag} set to ${resp.data.account.isExternal ? "external" : "main"}`);
                        } else {
                            throw new Error();
                        }
                    } catch (error) {
                        toast.error("Failed to update external status", { description: error instanceof Error ? error.message : undefined });
                        event.data.isExternal = event.oldValue;
                        event.api.refreshCells({ rowNodes: [event.node], force: true });
                    }
                    return;
                }
            },
        }}
        columnDefs={[
            {
                headerName: "Owner",
                field: "ownerName",
                sortable: true,
                filter: false,
                flex: 2,
                valueFormatter: (p) => p.value,
            },
            { headerName: "Account Tag", field: "cocAccountTag", sortable: true, filter: false, flex: 2, cellClass: "font-mono" },
            { headerName: "Discord ID", field: "discordUserId", sortable: true, filter: false, flex: 2, cellClass: "font-mono" },
            {
                headerName: "Current Clan",
                field: "currentClan",
                sortable: true,
                filter: false,
                flex: 2,
                minWidth: 140,
                valueFormatter: (p) => p.value ?? "—",
            },
            { headerName: "Town Hall", field: "townHall", sortable: true, filter: false, flex: 1, minWidth: 110, valueFormatter: formatNumber },
            {
                headerName: "War Weight",
                field: "warWeight",
                sortable: true,
                filter: false,
                flex: 1,
                editable: true,
                cellEditor: "uiInputEditor",
                cellEditorParams: { type: "number" },
                valueParser: (p) => Number(p.newValue),
                valueFormatter: (p) => (p.value != null ? Number(p.value).toLocaleString() : ""),
            },
            {
                headerName: "External",
                field: "isExternal",
                sortable: true,
                filter: false,
                flex: 1,
                editable: true,
                cellRenderer: "agCheckboxCellRenderer",
                cellEditor: "agCheckboxCellEditor",
                valueGetter: (p) => Boolean(p.data?.isExternal),
            },
            {
                headerName: "Total Donated",
                field: "totalDonated",
                sortable: true,
                filter: false,
                flex: 1,
                minWidth: 130,
                valueFormatter: formatNumber,
            },
            {
                headerName: "Total Received",
                field: "totalReceived",
                sortable: true,
                filter: false,
                flex: 1,
                minWidth: 130,
                valueFormatter: formatNumber,
            },
            { headerName: "Clan Games", field: "clanGames", sortable: true, filter: false, flex: 1, minWidth: 120, valueFormatter: formatNumber },
            {
                headerName: "Capital Looted",
                field: "capitalGoldLooted",
                sortable: true,
                filter: false,
                flex: 1,
                minWidth: 140,
                valueFormatter: formatNumber,
            },
            {
                headerName: "Capital Contributed",
                field: "capitalGoldContributed",
                sortable: true,
                filter: false,
                flex: 1,
                minWidth: 160,
                valueFormatter: formatNumber,
            },
            {
                headerName: "Activity Score",
                field: "activityScore",
                sortable: true,
                filter: false,
                flex: 1,
                minWidth: 130,
                valueFormatter: formatNumber,
            },
        ]}
    />

    <Toolbar>
        <Input placeholder="Search anything..." bind:value={searchText} onchange={handleSearchChange} class="lg:w-80" />
        <Button variant="success" class="shrink-0" onclick={handleSearchChange} tooltip="Search" tooltipPlacement="top">
            <TablerSearch class="size-5" />
        </Button>
        <Button variant="base" class="shrink-0" onclick={() => (syncDialogOpen = true)} tooltip="Sync from Google Sheet" tooltipPlacement="top">
            <TablerRefresh class="size-5" />
        </Button>
    </Toolbar>
</div>

<Dialog
    bind:open={syncDialogOpen}
    title="Sync from Google Sheet"
    description="Paste a link-viewable Google Sheet URL. Rows are matched to accounts by tag, and stats columns are updated."
    confirmText="Sync"
    onConfirm={handleSync}
>
    <div class="flex flex-col items-start justify-center gap-1">
        <p class="text-sm font-medium">Sheet URL</p>
        <Input placeholder="https://docs.google.com/spreadsheets/d/.../edit?gid=0" bind:value={sheetUrl} />
        <p class="mt-1 text-xs text-stone-400">The sheet must be shared as “Anyone with the link → Viewer”. No API key needed.</p>
    </div>
</Dialog>

<Dialog
    bind:open={syncResultOpen}
    title="Sync complete"
    description={syncResult
        ? `Updated ${syncResult.updated} account${syncResult.updated === 1 ? "" : "s"}.${syncResult.skipped ? ` ${syncResult.skipped} sheet row(s) had no tag.` : ""}`
        : ""}
    confirmText="Done"
    cancelText="Close"
    onConfirm={() => {}}
>
    {#if syncResult}
        <div class="flex flex-col gap-4 text-sm">
            <div class="flex flex-col gap-1">
                <div class="flex items-center justify-between gap-2">
                    <p class="font-medium text-stone-100">Not in sheet ({syncResult.notInSheet.length})</p>
                    {#if syncResult.notInSheet.length}
                        <Button
                            variant="ghost"
                            size="icon"
                            tooltip="Copy name + tag"
                            tooltipPlacement="top"
                            onclick={() => copyList(syncResult!.notInSheet.map((a) => ({ name: a.ownerName ?? "", tag: a.cocAccountTag })))}
                        >
                            <TablerCopy class="size-4" />
                        </Button>
                    {/if}
                </div>
                <p class="text-xs text-stone-400">Linked accounts with no matching row in the sheet.</p>
                {#if syncResult.notInSheet.length}
                    <div class="mt-1 max-h-40 divide-y divide-stone-800 overflow-y-auto rounded-md border border-stone-700/50 bg-stone-950/40">
                        {#each syncResult.notInSheet as a}
                            <div class="flex items-center justify-between gap-3 px-3 py-1.5">
                                <span class="truncate text-stone-200">{a.ownerName ?? "—"}</span>
                                <span class="shrink-0 font-mono text-xs text-stone-400">{a.cocAccountTag}</span>
                            </div>
                        {/each}
                    </div>
                {:else}
                    <p class="text-xs text-stone-500">All linked accounts were present in the sheet.</p>
                {/if}
            </div>

            <div class="flex flex-col gap-1">
                <div class="flex items-center justify-between gap-2">
                    <p class="font-medium text-stone-100">Not linked ({syncResult.notLinked.length})</p>
                    {#if syncResult.notLinked.length}
                        <Button
                            variant="ghost"
                            size="icon"
                            tooltip="Copy name + tag"
                            tooltipPlacement="top"
                            onclick={() => copyList(syncResult!.notLinked.map((r) => ({ name: r.name, tag: r.tag })))}
                        >
                            <TablerCopy class="size-4" />
                        </Button>
                    {/if}
                </div>
                <p class="text-xs text-stone-400">Sheet rows whose tag isn’t a linked account in the database.</p>
                {#if syncResult.notLinked.length}
                    <div class="mt-1 max-h-40 divide-y divide-stone-800 overflow-y-auto rounded-md border border-stone-700/50 bg-stone-950/40">
                        {#each syncResult.notLinked as r}
                            <div class="flex items-center justify-between gap-3 px-3 py-1.5">
                                <span class="truncate text-stone-200">{r.name || "—"}</span>
                                <span class="shrink-0 font-mono text-xs text-stone-400">{r.tag}</span>
                            </div>
                        {/each}
                    </div>
                {:else}
                    <p class="text-xs text-stone-500">Every sheet row matched a linked account.</p>
                {/if}
            </div>
        </div>
    {/if}
</Dialog>
