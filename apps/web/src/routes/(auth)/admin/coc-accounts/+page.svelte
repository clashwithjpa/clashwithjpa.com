<script lang="ts">
    import { PUBLIC_SERVER_URL } from "$env/static/public";
    import CocAccountSidebar from "$lib/components/CocAccountSidebar.svelte";
    import CocAccountCell from "$lib/components/grid/CocAccountCell.svelte";
    import CocOwnerCell from "$lib/components/grid/CocOwnerCell.svelte";
    import Toolbar from "$lib/components/Toolbar.svelte";
    import Button from "$lib/components/ui/Button.svelte";
    import ConfirmationDialog from "$lib/components/ui/ConfirmationDialog.svelte";
    import Dialog from "$lib/components/ui/Dialog.svelte";
    import Grid from "$lib/components/ui/Grid.svelte";
    import { svelteRenderer } from "$lib/components/ui/grid/SvelteCellRenderer";
    import Input from "$lib/components/ui/Input.svelte";
    import Seo from "$lib/components/ui/Seo.svelte";
    import { Sidebar } from "$lib/components/ui/sidebar";
    import { fadeIn } from "$lib/utils/animations";
    import {
        deleteCocAccountsBulk,
        getAdminCocAccounts,
        syncCocAccounts,
        updateCocAccountExternal,
        updateCocAccountStats,
        updateCocAccountWarWeight,
    } from "@repo/clashofclans-client";
    import type { GridApi, IDatasource, IGetRowsParams } from "ag-grid-community";
    import { toast } from "svelte-sonner";
    import SvgSpinnersRingResize from "~icons/svg-spinners/ring-resize";
    import TablerCheck from "~icons/tabler/check";
    import TablerCopy from "~icons/tabler/copy";
    import TablerDownload from "~icons/tabler/download";
    import TablerSearch from "~icons/tabler/search";
    import TablerTableDashed from "~icons/tabler/table-dashed";
    import TablerTrash from "~icons/tabler/trash";
    import TablerX from "~icons/tabler/x";

    type SyncResult = {
        updated: number;
        skipped: number;
        notLinked: { tag: string; name: string }[];
        notInSheet: { cocAccountTag: string; ownerName: string | null }[];
    };

    let { data }: { data: { canDelete: boolean } } = $props();

    let gridApi: GridApi | null = $state(null);
    let searchText = $state("");
    let selectedIds = $state<number[]>([]);
    let bulkProcessing = $state(false);
    let downloading = $state(false);
    let syncDialogOpen = $state(false);
    let sheetUrl = $state("");
    let syncResult = $state<SyncResult | null>(null);
    let syncResultOpen = $state(false);
    let accountSidebar: Sidebar | null = $state(null);
    let selectedAccount = $state<Record<string, unknown> | null>(null);
    let copied: Record<string, boolean> = $state({});

    // Account data is fetched lazily in the sidebar (one CoC API call on demand)
    // rather than enriching every row on load.
    const gridContext = {
        openAccountSidebar: (account: Record<string, unknown>) => {
            selectedAccount = account;
            accountSidebar?.open(String(account.id));
        },
    };

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
        const toastId = toast.loading("Syncing from Google Sheet…");
        try {
            // The fetch client returns the parsed body even on 4xx, so handle the error shape too.
            const resp = (await syncCocAccounts(
                { sheetUrl: sheetUrl.trim() },
                { baseURL: PUBLIC_SERVER_URL, credentials: "include", headers: { "Content-Type": "application/json" } },
            )) as { success: true; data: SyncResult } | { success: false; error: string | Record<string, unknown> };
            if (!resp.success) throw new Error(typeof resp.error === "string" ? resp.error : "Sheet could not be read");
            toast.success(`Synced ${resp.data.updated} account${resp.data.updated === 1 ? "" : "s"}`, { id: toastId });
            syncResult = resp.data;
            syncResultOpen = true;
            sheetUrl = "";
            gridApi?.setGridOption("datasource", createDatasource());
        } catch (error) {
            toast.error("Sync failed", {
                id: toastId,
                description: error instanceof Error && error.message ? error.message : "Make sure the sheet is link-viewable",
            });
            // Dialog auto-closes on confirm; reopen so the URL can be fixed and retried.
            syncDialogOpen = true;
        }
    }

    async function copyList(rows: { name: string; tag: string }[], key: string) {
        const text = rows.map((r) => `${r.name} ${r.tag}`.trim()).join("\n");
        try {
            await navigator.clipboard.writeText(text);
            copied[key] = true;
            setTimeout(() => {
                copied[key] = false;
            }, 2000);
        } catch {
            toast.error("Couldn't copy to clipboard");
        }
    }

    function clearSelection() {
        gridApi?.deselectAll();
        selectedIds = [];
    }

    // The bulk delete endpoint caps each request at 200 ids, so split larger
    // selections into sequential batches.
    const BULK_BATCH_SIZE = 200;
    function chunk<T>(items: T[], size: number): T[][] {
        const batches: T[][] = [];
        for (let i = 0; i < items.length; i += size) batches.push(items.slice(i, i + size));
        return batches;
    }

    async function bulkDelete() {
        if (selectedIds.length === 0) return;
        bulkProcessing = true;
        const ids = selectedIds;
        try {
            let count = 0;
            for (const batch of chunk(ids, BULK_BATCH_SIZE)) {
                const resp = await deleteCocAccountsBulk(
                    { ids: batch },
                    { baseURL: PUBLIC_SERVER_URL, credentials: "include", headers: { "Content-Type": "application/json" } },
                );
                if (!resp.success) throw new Error("Failed to delete accounts");
                count += resp.data.count;
            }
            toast.success(`${count} account${count === 1 ? "" : "s"} deleted`);
            clearSelection();
            // Refresh the loaded blocks in place; replacing the datasource would
            // purge the whole cache and reset scroll, making the table "reshuffle".
            gridApi?.refreshInfiniteCache();
        } catch (error) {
            toast.error("Failed to delete accounts", { description: error instanceof Error ? error.message : undefined });
            // A later batch may have failed after earlier ones succeeded; resync.
            gridApi?.refreshInfiniteCache();
        } finally {
            bulkProcessing = false;
        }
    }

    // Wraps a CSV cell so commas, quotes and newlines survive a round-trip.
    function csvCell(value: unknown): string {
        const s = value == null ? "" : String(value);
        return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    }

    // Columns mirror the Google Sheet import shape (see syncCocAccounts), so an
    // exported file can be edited and synced straight back in.
    const CSV_COLUMNS: { header: string; field: string }[] = [
        { header: "Tag", field: "cocAccountTag" },
        { header: "Discord ID", field: "discordUserId" },
        { header: "Current Clan", field: "currentClan" },
        { header: "Town Hall", field: "townHall" },
        { header: "Total Donated", field: "totalDonated" },
        { header: "Total Received", field: "totalReceived" },
        { header: "Clan Games", field: "clanGames" },
        { header: "Capital Gold Looted", field: "capitalGoldLooted" },
        { header: "Capital Gold Contributed", field: "capitalGoldContributed" },
        { header: "Activity Score", field: "activityScore" },
    ];

    async function downloadCsv() {
        downloading = true;
        const toastId = toast.loading("Preparing CSV…");
        try {
            const PAGE = 200;
            const rows: Record<string, unknown>[] = [];
            for (let offset = 0; ; offset += PAGE) {
                const resp = await getAdminCocAccounts(
                    { limit: PAGE, offset, search: searchText || undefined },
                    { baseURL: PUBLIC_SERVER_URL, credentials: "include" },
                );
                if (!resp.success) throw new Error("Failed to load accounts");
                rows.push(...resp.data.accounts);
                if (rows.length >= resp.data.total || resp.data.accounts.length === 0) break;
            }

            const lines = [
                CSV_COLUMNS.map((c) => csvCell(c.header)).join(","),
                ...rows.map((r) => CSV_COLUMNS.map((c) => csvCell(r[c.field])).join(",")),
            ];
            const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `coc-accounts-${new Date().toISOString().slice(0, 10)}.csv`;
            a.click();
            URL.revokeObjectURL(url);
            toast.success(`Exported ${rows.length} account${rows.length === 1 ? "" : "s"}`, { id: toastId });
        } catch (error) {
            toast.error("Failed to export CSV", { id: toastId, description: error instanceof Error ? error.message : undefined });
        } finally {
            downloading = false;
        }
    }

    const formatNumber = (p: { value: unknown }) => (p.value != null ? Number(p.value).toLocaleString() : "");

    // Sheet-synced columns that are manually editable in the grid (see updateCocAccountStats).
    const STAT_FIELDS = ["currentClan", "totalDonated", "totalReceived", "clanGames", "capitalGoldLooted", "capitalGoldContributed", "activityScore"];
</script>

<Seo title="COC Accounts" description="View linked Clash of Clans accounts and manage their war weights." />

<div class="relative flex size-full flex-col overflow-hidden" in:fadeIn>
    <Grid
        gridOptions={{
            context: gridContext,
            rowHeight: 56,
            rowModelType: "infinite",
            cacheBlockSize: 50,
            blockLoadDebounceMillis: 300,
            rowSelection: { mode: "multiRow", checkboxes: true, enableClickSelection: false },
            onGridReady: (params) => {
                gridApi = params.api;
                gridApi.setGridOption("datasource", createDatasource());
            },
            onSelectionChanged: (event) => {
                selectedIds = event.api.getSelectedRows().map((r) => r.id);
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

                // Sheet-synced stat columns are edited one cell at a time and patched individually.
                // A later Google Sheet sync will overwrite these manual edits.
                const field = event.colDef.field;
                if (field && STAT_FIELDS.includes(field)) {
                    let value: string | number | null;
                    if (field === "currentClan") {
                        const text = String(event.newValue ?? "").trim();
                        value = text === "" ? null : text;
                    } else {
                        const n = Number(event.newValue);
                        if (!Number.isInteger(n) || n < 0) {
                            toast.error(`${event.colDef.headerName} must be a non-negative whole number`);
                            event.data[field] = event.oldValue;
                            event.api.refreshCells({ rowNodes: [event.node], force: true });
                            return;
                        }
                        value = n;
                    }

                    try {
                        const resp = await updateCocAccountStats(
                            event.data.id,
                            { [field]: value },
                            { baseURL: PUBLIC_SERVER_URL, credentials: "include", headers: { "Content-Type": "application/json" } },
                        );
                        if (resp.success) {
                            event.data[field] = (resp.data.account as Record<string, unknown>)[field];
                            event.api.refreshCells({ rowNodes: [event.node], force: true });
                            toast.success(`${event.colDef.headerName} updated for ${event.data.cocAccountTag}`);
                        } else {
                            throw new Error();
                        }
                    } catch (error) {
                        toast.error(`Failed to update ${event.colDef.headerName?.toLowerCase()}`, {
                            description: error instanceof Error ? error.message : undefined,
                        });
                        event.data[field] = event.oldValue;
                        event.api.refreshCells({ rowNodes: [event.node], force: true });
                    }
                    return;
                }
            },
        }}
        columnDefs={[
            {
                headerName: "User",
                field: "ownerName",
                sortable: true,
                filter: false,
                flex: 2,
                minWidth: 200,
                cellRenderer: svelteRenderer(CocOwnerCell),
            },
            {
                headerName: "Account",
                field: "cocAccountTag",
                sortable: true,
                filter: false,
                flex: 2,
                minWidth: 200,
                cellRenderer: svelteRenderer(CocAccountCell),
            },
            {
                headerName: "Clan",
                field: "currentClan",
                sortable: true,
                filter: false,
                flex: 2,
                minWidth: 160,
                editable: true,
                cellEditor: "uiInputEditor",
                valueFormatter: (p) => p.value ?? "",
            },
            {
                headerName: "War Weight",
                field: "warWeight",
                sortable: true,
                filter: false,
                flex: 1,
                editable: true,
                sort: "desc",
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
                editable: true,
                cellEditor: "uiInputEditor",
                cellEditorParams: { type: "number" },
                valueParser: (p) => Number(p.newValue),
                valueFormatter: formatNumber,
            },
            {
                headerName: "Total Received",
                field: "totalReceived",
                sortable: true,
                filter: false,
                flex: 1,
                minWidth: 130,
                editable: true,
                cellEditor: "uiInputEditor",
                cellEditorParams: { type: "number" },
                valueParser: (p) => Number(p.newValue),
                valueFormatter: formatNumber,
            },
            {
                headerName: "Clan Games",
                field: "clanGames",
                sortable: true,
                filter: false,
                flex: 1,
                minWidth: 120,
                editable: true,
                cellEditor: "uiInputEditor",
                cellEditorParams: { type: "number" },
                valueParser: (p) => Number(p.newValue),
                valueFormatter: formatNumber,
            },
            {
                headerName: "Capital Looted",
                field: "capitalGoldLooted",
                sortable: true,
                filter: false,
                flex: 1,
                minWidth: 140,
                editable: true,
                cellEditor: "uiInputEditor",
                cellEditorParams: { type: "number" },
                valueParser: (p) => Number(p.newValue),
                valueFormatter: formatNumber,
            },
            {
                headerName: "Capital Contributed",
                field: "capitalGoldContributed",
                sortable: true,
                filter: false,
                flex: 1,
                minWidth: 160,
                editable: true,
                cellEditor: "uiInputEditor",
                cellEditorParams: { type: "number" },
                valueParser: (p) => Number(p.newValue),
                valueFormatter: formatNumber,
            },
            {
                headerName: "Activity Score",
                field: "activityScore",
                sortable: true,
                filter: false,
                flex: 1,
                minWidth: 130,
                editable: true,
                cellEditor: "uiInputEditor",
                cellEditorParams: { type: "number" },
                valueParser: (p) => Number(p.newValue),
                valueFormatter: formatNumber,
            },
        ]}
    />

    <Toolbar class="w-full flex-wrap sm:w-auto sm:flex-nowrap">
        {#if selectedIds.length > 0}
            <div class="flex shrink-0 items-center gap-2">
                <span class="px-2 text-sm font-medium whitespace-nowrap text-stone-200">{selectedIds.length} selected</span>
                {#if data.canDelete}
                    <ConfirmationDialog
                        title="Delete accounts?"
                        description="Permanently delete {selectedIds.length} selected Clash of Clans account{selectedIds.length === 1
                            ? ''
                            : 's'}. This also removes their CWL applications and cannot be undone."
                        confirmText="Delete accounts"
                        onConfirm={bulkDelete}
                    >
                        <Button variant="danger" class="shrink-0" disabled={bulkProcessing} tooltip="Delete selected" tooltipPlacement="top">
                            {#if bulkProcessing}
                                <SvgSpinnersRingResize class="size-5" />
                            {:else}
                                <TablerTrash class="size-5" />
                            {/if}
                        </Button>
                    </ConfirmationDialog>
                {/if}
                <Button
                    variant="ghost"
                    class="shrink-0"
                    disabled={bulkProcessing}
                    onclick={clearSelection}
                    tooltip="Clear selection"
                    tooltipPlacement="top"
                >
                    <TablerX class="size-5" />
                </Button>
            </div>
            <div class="hidden h-8 w-px shrink-0 bg-stone-700 sm:block"></div>
        {/if}
        <div class="flex w-full items-center gap-2 sm:w-auto">
            <Input
                placeholder="Search anything..."
                bind:value={searchText}
                onchange={handleSearchChange}
                class="min-w-0 flex-1 sm:w-64 sm:flex-none lg:w-80"
            />
            <Button variant="success" class="shrink-0" onclick={handleSearchChange} tooltip="Search" tooltipPlacement="top">
                <TablerSearch class="size-5" />
            </Button>
            <Button variant="base" class="shrink-0" onclick={() => (syncDialogOpen = true)} tooltip="Sync from Google Sheet" tooltipPlacement="top">
                <TablerTableDashed class="size-5" />
            </Button>
            <Button variant="base" class="shrink-0" disabled={downloading} onclick={downloadCsv} tooltip="Download as CSV" tooltipPlacement="top">
                {#if downloading}
                    <SvgSpinnersRingResize class="size-5" />
                {:else}
                    <TablerDownload class="size-5" />
                {/if}
            </Button>
        </div>
    </Toolbar>
</div>

<Sidebar bind:this={accountSidebar}>
    {#if selectedAccount}
        <CocAccountSidebar account={selectedAccount as any} />
    {/if}
</Sidebar>

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
        <p class="mt-1 text-xs text-stone-400">The sheet must be shared as “Anyone with the link → Viewer”.</p>
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
                            variant={copied["notInSheet"] ? "success" : "ghost"}
                            size="icon"
                            tooltip={copied["notInSheet"] ? "Copied!" : "Copy name + tag"}
                            tooltipPlacement="top"
                            onclick={() =>
                                copyList(
                                    syncResult!.notInSheet.map((a) => ({ name: a.ownerName ?? "", tag: a.cocAccountTag })),
                                    "notInSheet",
                                )}
                        >
                            {#if copied["notInSheet"]}
                                <TablerCheck class="size-4" />
                            {:else}
                                <TablerCopy class="size-4" />
                            {/if}
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
                            variant={copied["notLinked"] ? "success" : "ghost"}
                            size="icon"
                            tooltip={copied["notLinked"] ? "Copied!" : "Copy name + tag"}
                            tooltipPlacement="top"
                            onclick={() =>
                                copyList(
                                    syncResult!.notLinked.map((r) => ({ name: r.name, tag: r.tag })),
                                    "notLinked",
                                )}
                        >
                            {#if copied["notLinked"]}
                                <TablerCheck class="size-4" />
                            {:else}
                                <TablerCopy class="size-4" />
                            {/if}
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
