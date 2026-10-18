<script lang="ts">
    /* eslint-disable @typescript-eslint/no-explicit-any */
    import { PUBLIC_SERVER_URL } from "$env/static/public";
    import CocAccountSidebar from "$lib/components/CocAccountSidebar.svelte";
    import CocAccountCell from "$lib/components/grid/CocAccountCell.svelte";
    import CocOwnerCell from "$lib/components/grid/CocOwnerCell.svelte";
    import CwlNicknameCell from "$lib/components/grid/CwlNicknameCell.svelte";
    import Toolbar from "$lib/components/Toolbar.svelte";
    import Button from "$lib/components/ui/Button.svelte";
    import ConfirmationDialog from "$lib/components/ui/ConfirmationDialog.svelte";
    import Dialog from "$lib/components/ui/Dialog.svelte";
    import Input from "$lib/components/ui/Input.svelte";
    import PageHeader from "$lib/components/ui/PageHeader.svelte";
    import Seo from "$lib/components/ui/Seo.svelte";
    import { Sidebar } from "$lib/components/ui/sidebar";
    import DataTable from "$lib/components/ui/table/DataTable.svelte";
    import type { TableColumn } from "$lib/components/ui/table/features";
    import { InfiniteRows } from "$lib/components/ui/table/infinite.svelte";
    import Toggle from "$lib/components/ui/Toggle.svelte";
    import UserCombobox, { type ComboboxUser } from "$lib/components/ui/UserCombobox.svelte";
    import { loadGuildNicknames } from "$lib/discordNicknames";
    import {
        createCocAccount,
        deleteCocAccountsBulk,
        getAdminCocAccounts,
        getAdminUsers,
        syncCocAccounts,
        syncCocAccountWarWeights,
        updateCocAccountExternal,
        updateCocAccountStats,
        updateCocAccountWarWeight,
        type GetAdminCocAccounts200,
    } from "@repo/clashofclans-client";
    import { renderComponent, renderSnippet, type RowSelectionState, type SortingState } from "@tanstack/svelte-table";
    import { untrack } from "svelte";
    import { toast } from "svelte-sonner";
    import SvgSpinnersRingResize from "~icons/svg-spinners/ring-resize";
    import TablerCheck from "~icons/tabler/check";
    import TablerCopy from "~icons/tabler/copy";
    import TablerDownload from "~icons/tabler/download";
    import TablerScale from "~icons/tabler/scale";
    import TablerSearch from "~icons/tabler/search";
    import TablerTableDashed from "~icons/tabler/table-dashed";
    import TablerTrash from "~icons/tabler/trash";
    import TablerUserPlus from "~icons/tabler/user-plus";
    import TablerX from "~icons/tabler/x";

    type SyncResult = {
        updated: number;
        skipped: number;
        notLinked: { tag: string; name: string }[];
        notInSheet: { cocAccountTag: string; ownerName: string | null }[];
    };

    type WarWeightSyncResult = {
        updated: number;
        notInFwa: { cocAccountTag: string; ownerName: string | null }[];
        failedClans: { tag: string; name: string | null }[];
    };

    type Account = GetAdminCocAccounts200["data"]["accounts"][number] & { discordNickname?: string };

    let { data }: { data: { canDelete: boolean } } = $props();

    let guildNicknames: Record<string, string> = {};
    let nicknamesLoading = $state(false);
    let searchText = $state("");
    let sorting = $state<SortingState>([{ id: "warWeight", desc: true }]);
    let rowSelection = $state<RowSelectionState>({});
    let selectedIds = $derived(
        Object.keys(rowSelection)
            .filter((id) => rowSelection[id])
            .map(Number),
    );
    let bulkProcessing = $state(false);
    let downloading = $state(false);
    let syncDialogOpen = $state(false);
    let sheetUrl = $state("");
    let syncResult = $state<SyncResult | null>(null);
    let syncResultOpen = $state(false);
    let warWeightDialogOpen = $state(false);
    let warWeightSyncing = $state(false);
    let warWeightResult = $state<WarWeightSyncResult | null>(null);
    let warWeightResultOpen = $state(false);
    let pastedFwa = $state("");
    let applyingPaste = $state(false);
    let accountSidebar: Sidebar | null = $state(null);
    let selectedAccount = $state<Record<string, unknown> | null>(null);
    let copied: Record<string, boolean> = $state({});

    // --- Manual add (admin-only): link a CoC account by tag, no API token required ---
    let addOpen = $state(false);
    let addSelectedUser = $state<ComboboxUser | null>(null);
    let addTag = $state("");
    let addWarWeight = $state(0);
    let addExternal = $state(false);
    let addSubmitting = $state(false);

    function openAdd() {
        addSelectedUser = null;
        addTag = "";
        addWarWeight = 0;
        addExternal = false;
        addOpen = true;
    }

    async function searchUsers(query: string): Promise<ComboboxUser[]> {
        try {
            const resp = await getAdminUsers({ search: query, limit: 8 }, { baseURL: PUBLIC_SERVER_URL, credentials: "include" });
            if (resp.success) return resp.data.users as ComboboxUser[];
        } catch {
            // return empty on failure
        }
        return [];
    }

    async function submitAdd() {
        if (!addSelectedUser) {
            toast.error("Select a member first");
            addOpen = true;
            return;
        }
        const tag = addTag.trim();
        if (!tag) {
            toast.error("Enter a Clash of Clans account tag");
            addOpen = true;
            return;
        }
        const warWeight = Number(addWarWeight);
        if (!Number.isInteger(warWeight) || warWeight < 0) {
            toast.error("War weight must be a non-negative whole number");
            addOpen = true;
            return;
        }
        addSubmitting = true;
        try {
            const resp = (await createCocAccount(
                { userId: addSelectedUser.id, tag: tag.startsWith("#") ? tag : `#${tag}`, warWeight, isExternal: addExternal },
                { baseURL: PUBLIC_SERVER_URL, credentials: "include", headers: { "Content-Type": "application/json" } },
            )) as { success: true; data: { account: { cocAccountTag: string } } } | { success: false; error: string | Record<string, unknown> };
            if (resp.success) {
                toast.success(`Linked ${resp.data.account.cocAccountTag} to ${addSelectedUser.name}`);
                // Refresh the loaded rows in place so the new account appears.
                list.refresh();
            } else {
                toast.error(typeof resp.error === "string" ? resp.error : "Failed to add account");
                addOpen = true;
            }
        } catch (error) {
            toast.error("Failed to add account", { description: error instanceof Error ? error.message : undefined });
            addOpen = true;
        } finally {
            addSubmitting = false;
        }
    }

    // Account data is fetched lazily in the sidebar (one CoC API call on demand)
    // rather than enriching every row on load.
    function openAccountSidebar(account: Account) {
        selectedAccount = account;
        accountSidebar?.open(String(account.id));
    }

    const list = new InfiniteRows<Account>(async (offset, limit) => {
        const sort = sorting[0];
        try {
            const resp = await getAdminCocAccounts(
                { limit, offset, search: searchText || undefined, sortBy: sort?.id, sortDir: sort ? (sort.desc ? "desc" : "asc") : undefined },
                { baseURL: PUBLIC_SERVER_URL, credentials: "include" },
            );
            if (!resp.success) throw new Error();
            return {
                rows: resp.data.accounts.map((a) => ({ ...a, discordNickname: a.discordUserId ? guildNicknames[a.discordUserId] : undefined })),
                total: resp.data.total,
            };
        } catch (error) {
            toast.error("Failed to load COC accounts", { description: error instanceof Error ? error.message : "An unknown error occurred" });
            return null;
        }
    });

    function handleSearchChange() {
        list.reset();
    }

    // Nicknames are fetched separately from the row pages so the table isn't
    // blocked on the Discord guild-member walk. Rows already fetched are backfilled.
    async function loadNicknames() {
        nicknamesLoading = true;
        try {
            guildNicknames = await loadGuildNicknames();
            list.update(
                (a) => !!a.discordUserId,
                (a) => ({ discordNickname: guildNicknames[a.discordUserId] }),
            );
        } finally {
            nicknamesLoading = false;
        }
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
            list.reset();
        } catch (error) {
            toast.error("Sync failed", {
                id: toastId,
                description: error instanceof Error && error.message ? error.message : "Make sure the sheet is link-viewable",
            });
            // Dialog auto-closes on confirm; reopen so the URL can be fixed and retried.
            syncDialogOpen = true;
        }
    }

    type FwaMember = { tag: string; weight: number };

    const fwaMembersUrl = (clanTag: string) => `https://fwastats.com/Clan/${encodeURIComponent(clanTag.replace(/^#/, ""))}/Members.json`;

    // Server fetches every clan's roster and updates by tag; unreachable clans come back for manual paste.
    async function handleWarWeightSync() {
        warWeightSyncing = true;
        const toastId = toast.loading("Syncing war weights from FWA…");
        try {
            const resp = (await syncCocAccountWarWeights(
                {},
                { baseURL: PUBLIC_SERVER_URL, credentials: "include", headers: { "Content-Type": "application/json" } },
            )) as { success: true; data: WarWeightSyncResult } | { success: false; error: string | Record<string, unknown> };
            if (!resp.success) throw new Error(typeof resp.error === "string" ? resp.error : "Failed to sync war weights");

            const failed = resp.data.failedClans.length;
            const suffix = failed ? ` (${failed} clan${failed === 1 ? "" : "s"} need manual paste)` : "";
            toast.success(`Updated ${resp.data.updated} war weight${resp.data.updated === 1 ? "" : "s"}${suffix}`, { id: toastId });
            warWeightResult = resp.data;
            pastedFwa = "";
            warWeightResultOpen = true;
            list.reset();
        } catch (error) {
            toast.error("War weight sync failed", {
                id: toastId,
                description: error instanceof Error && error.message ? error.message : undefined,
            });
            // Dialog auto-closes on confirm; reopen so it can be retried.
            warWeightDialogOpen = true;
        } finally {
            warWeightSyncing = false;
        }
    }

    // Send a pasted roster to the same endpoint, which applies `members` without re-fetching.
    async function applyPastedFwa() {
        const text = pastedFwa.trim();
        if (!text) {
            toast.error("Paste a clan's Members.json first");
            return;
        }
        let members: FwaMember[];
        try {
            const parsed = JSON.parse(text);
            if (!Array.isArray(parsed)) throw new Error();
            members = parsed;
        } catch {
            toast.error("That doesn't look like valid FWA JSON");
            return;
        }
        const clean = members
            .filter((m) => m && typeof m.tag === "string" && typeof m.weight === "number" && m.weight > 0)
            .map((m) => ({ tag: m.tag, weight: m.weight }));
        if (clean.length === 0) {
            toast.error("No usable weights found in the pasted data");
            return;
        }

        applyingPaste = true;
        const toastId = toast.loading("Applying pasted weights…");
        try {
            const resp = (await syncCocAccountWarWeights(
                { members: clean },
                { baseURL: PUBLIC_SERVER_URL, credentials: "include", headers: { "Content-Type": "application/json" } },
            )) as { success: true; data: WarWeightSyncResult } | { success: false; error: string | Record<string, unknown> };
            if (!resp.success) throw new Error(typeof resp.error === "string" ? resp.error : "Failed to apply weights");
            toast.success(`Updated ${resp.data.updated} war weight${resp.data.updated === 1 ? "" : "s"} from pasted data`, { id: toastId });
            pastedFwa = "";
            list.reset();
        } catch (error) {
            toast.error("Failed to apply pasted weights", {
                id: toastId,
                description: error instanceof Error && error.message ? error.message : undefined,
            });
        } finally {
            applyingPaste = false;
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
        rowSelection = {};
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
            // Refresh the loaded rows in place; a reset would jump back to the top
            // and make the table "reshuffle".
            list.refresh();
        } catch (error) {
            toast.error("Failed to delete accounts", { description: error instanceof Error ? error.message : undefined });
            // A later batch may have failed after earlier ones succeeded; resync.
            list.refresh();
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
        { header: "Nickname", field: "discordNickname" },
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
                rows.push(
                    ...resp.data.accounts.map((a) => ({ ...a, discordNickname: a.discordUserId ? guildNicknames[a.discordUserId] : undefined })),
                );
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

    const formatNumber = (value: unknown) => (value != null ? Number(value).toLocaleString() : "");

    // Sheet-synced columns that are manually editable in the table (see updateCocAccountStats).
    // A later Google Sheet sync will overwrite these manual edits.
    type StatField =
        "currentClan" | "totalDonated" | "totalReceived" | "clanGames" | "capitalGoldLooted" | "capitalGoldContributed" | "activityScore";

    async function saveWarWeight(account: Account, warWeight: number) {
        if (!Number.isInteger(warWeight) || warWeight < 0) {
            toast.error("War weight must be a non-negative whole number");
            return;
        }
        const previous = account.warWeight;
        const same = (a: Account) => a.id === account.id;
        list.update(same, () => ({ warWeight }));
        try {
            const resp = await updateCocAccountWarWeight(
                account.id,
                { warWeight },
                { baseURL: PUBLIC_SERVER_URL, credentials: "include", headers: { "Content-Type": "application/json" } },
            );
            if (!resp.success) throw new Error();
            list.update(same, () => ({ warWeight: resp.data.account.warWeight }));
            toast.success(`War weight updated for ${account.cocAccountTag}`);
        } catch (error) {
            list.update(same, () => ({ warWeight: previous }));
            toast.error("Failed to update war weight", { description: error instanceof Error ? error.message : undefined });
        }
    }

    async function saveExternal(account: Account, isExternal: boolean) {
        const previous = account.isExternal;
        const same = (a: Account) => a.id === account.id;
        list.update(same, () => ({ isExternal }));
        try {
            const resp = await updateCocAccountExternal(
                account.id,
                { isExternal },
                { baseURL: PUBLIC_SERVER_URL, credentials: "include", headers: { "Content-Type": "application/json" } },
            );
            if (!resp.success) throw new Error();
            list.update(same, () => ({ isExternal: resp.data.account.isExternal }));
            toast.success(`${account.cocAccountTag} set to ${resp.data.account.isExternal ? "external" : "main"}`);
        } catch (error) {
            list.update(same, () => ({ isExternal: previous }));
            toast.error("Failed to update external status", { description: error instanceof Error ? error.message : undefined });
        }
    }

    async function saveStat(account: Account, field: StatField, label: string, input: string | number) {
        let value: string | number | null;
        if (field === "currentClan") {
            const text = String(input ?? "").trim();
            value = text === "" ? null : text;
        } else {
            const n = Number(input);
            if (!Number.isInteger(n) || n < 0) {
                toast.error(`${label} must be a non-negative whole number`);
                return;
            }
            value = n;
        }
        const previous = account[field];
        const same = (a: Account) => a.id === account.id;
        list.update(same, () => ({ [field]: value }));
        try {
            const resp = await updateCocAccountStats(
                account.id,
                { [field]: value },
                { baseURL: PUBLIC_SERVER_URL, credentials: "include", headers: { "Content-Type": "application/json" } },
            );
            if (!resp.success) throw new Error();
            list.update(same, () => ({ [field]: (resp.data.account as Record<string, unknown>)[field] }));
            toast.success(`${label} updated for ${account.cocAccountTag}`);
        } catch (error) {
            list.update(same, () => ({ [field]: previous }));
            toast.error(`Failed to update ${label.toLowerCase()}`, { description: error instanceof Error ? error.message : undefined });
        }
    }

    function statColumn(field: Exclude<StatField, "currentClan">, header: string, size: number): TableColumn<Account> {
        return {
            accessorKey: field,
            header,
            size,
            cell: ({ getValue }) => formatNumber(getValue()),
            meta: { edit: { type: "number", commit: (a: Account, n: number) => saveStat(a, field, header, n) } },
        };
    }

    const columns: TableColumn<Account>[] = [
        {
            accessorKey: "ownerName",
            header: "User",
            size: 220,
            cell: ({ row }) => renderComponent(CocOwnerCell, { account: row.original }),
        },
        {
            accessorKey: "discordNickname",
            header: "Nickname",
            size: 150,
            enableSorting: false,
            cell: ({ getValue }) => renderComponent(CwlNicknameCell, { value: getValue(), loading: nicknamesLoading }),
        },
        {
            accessorKey: "cocAccountTag",
            header: "Account",
            size: 220,
            cell: ({ row }) => renderComponent(CocAccountCell, { account: row.original, onOpen: () => openAccountSidebar(row.original) }),
        },
        {
            accessorKey: "currentClan",
            header: "Clan",
            size: 160,
            cell: ({ getValue }) => getValue() ?? "",
            meta: { edit: { type: "text", commit: (a: Account, v: string) => saveStat(a, "currentClan", "Clan", v) } },
        },
        {
            accessorKey: "warWeight",
            header: "War Weight",
            size: 130,
            cell: ({ getValue }) => formatNumber(getValue()),
            meta: { edit: { type: "number", commit: saveWarWeight } },
        },
        {
            accessorKey: "isExternal",
            header: "External",
            size: 110,
            cell: ({ row }) => renderSnippet(externalCell, row.original),
        },
        statColumn("totalDonated", "Total Donated", 140),
        statColumn("totalReceived", "Total Received", 140),
        statColumn("clanGames", "Clan Games", 130),
        statColumn("capitalGoldLooted", "Capital Looted", 140),
        statColumn("capitalGoldContributed", "Capital Contributed", 170),
        statColumn("activityScore", "Activity Score", 140),
    ];

    // Sorting runs on the server, so a new sort reloads from the first page.
    $effect(() => {
        sorting; // track
        untrack(() => list.reset());
    });
    loadNicknames();
</script>

{#snippet externalCell(account: Account)}
    <Input
        type="checkbox"
        checked={account.isExternal}
        onchange={(e) => saveExternal(account, e.currentTarget.checked)}
        aria-label="External account"
    />
{/snippet}

<Seo title="COC Accounts" description="View linked Clash of Clans accounts and manage their war weights." />

<div class="relative flex size-full flex-col gap-4 overflow-hidden">
    <PageHeader title="COC Accounts" subtitle="{list.total} account{list.total === 1 ? '' : 's'}" class="px-4 pt-4">
        {#snippet actions()}
            <div class="flex min-w-60 flex-1 items-center gap-2 @4xl:max-w-96">
                <Input placeholder="Search anything..." bind:value={searchText} onchange={handleSearchChange} class="min-w-0 flex-1" />
                <Button variant="success" class="shrink-0" onclick={handleSearchChange} tooltip="Search" tooltipPlacement="bottom">
                    <TablerSearch class="size-5" />
                </Button>
            </div>
            <div class="flex shrink-0 items-center gap-2">
                {#if data.canDelete}
                    <Button variant="base" class="shrink-0" onclick={openAdd} tooltip="Add an account" tooltipPlacement="bottom">
                        <TablerUserPlus class="size-5" />
                    </Button>
                {/if}
                <Button
                    variant="base"
                    class="shrink-0"
                    onclick={() => (syncDialogOpen = true)}
                    tooltip="Sync from Google Sheet"
                    tooltipPlacement="bottom"
                >
                    <TablerTableDashed class="size-5" />
                </Button>
                <Button
                    variant="base"
                    class="shrink-0"
                    disabled={warWeightSyncing}
                    onclick={() => (warWeightDialogOpen = true)}
                    tooltip="Sync war weights from FWA"
                    tooltipPlacement="bottom"
                >
                    {#if warWeightSyncing}
                        <SvgSpinnersRingResize class="size-5" />
                    {:else}
                        <TablerScale class="size-5" />
                    {/if}
                </Button>
                <Button
                    variant="base"
                    class="shrink-0"
                    disabled={downloading}
                    onclick={downloadCsv}
                    tooltip="Download as CSV"
                    tooltipPlacement="bottom"
                >
                    {#if downloading}
                        <SvgSpinnersRingResize class="size-5" />
                    {:else}
                        <TablerDownload class="size-5" />
                    {/if}
                </Button>
            </div>
        {/snippet}
    </PageHeader>

    <div class="min-h-0 flex-1">
        <DataTable
            data={list.rows}
            {columns}
            getRowId={(a) => String(a.id)}
            loading={list.loading}
            manualSorting
            bind:sorting
            selectable
            bind:rowSelection
            onEndReached={() => list.loadMore()}
        />
    </div>

    {#if selectedIds.length > 0}
        <Toolbar class="flex-col items-start lg:flex-row lg:items-center">
            <span class="text-sm font-medium whitespace-nowrap text-stone-200">{selectedIds.length} selected</span>
            <div class="flex w-full gap-2">
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
        </Toolbar>
    {/if}
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
                                <TablerCheck />
                            {:else}
                                <TablerCopy />
                            {/if}
                        </Button>
                    {/if}
                </div>
                <p class="text-xs text-stone-400">Linked accounts with no matching row in the sheet.</p>
                {#if syncResult.notInSheet.length}
                    <div class="mt-1 max-h-40 divide-y divide-stone-800 overflow-y-auto rounded-md border border-stone-700/50 bg-stone-950/40">
                        {#each syncResult.notInSheet as a (a.cocAccountTag)}
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
                                <TablerCheck />
                            {:else}
                                <TablerCopy />
                            {/if}
                        </Button>
                    {/if}
                </div>
                <p class="text-xs text-stone-400">Sheet rows whose tag isn’t a linked account in the database.</p>
                {#if syncResult.notLinked.length}
                    <div class="mt-1 max-h-40 divide-y divide-stone-800 overflow-y-auto rounded-md border border-stone-700/50 bg-stone-950/40">
                        {#each syncResult.notLinked as r (r.tag)}
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

<Dialog
    bind:open={warWeightDialogOpen}
    title="Sync war weights from FWA"
    description="Fetches every JPA clan's roster from fwastats.com and overwrites the war weight of each matching linked account."
    confirmText={warWeightSyncing ? "Syncing…" : "Sync war weights"}
    onConfirm={handleWarWeightSync}
>
    <p class="text-sm text-stone-400">
        The server pulls each clan's roster from fwastats.com and matches by tag. Accounts with an unknown (0) FWA weight, or not in a JPA clan's
        roster, are left untouched. Any clan the server can't reach will be listed afterwards for a quick copy/paste.
    </p>
</Dialog>

<Dialog
    bind:open={warWeightResultOpen}
    title="War weights synced"
    description={warWeightResult ? `Updated ${warWeightResult.updated} account${warWeightResult.updated === 1 ? "" : "s"}.` : ""}
    confirmText="Done"
    cancelText="Close"
    onConfirm={() => {}}
>
    {#if warWeightResult}
        <div class="flex flex-col gap-4 text-sm">
            {#if warWeightResult.failedClans.length}
                <div class="flex flex-col gap-2 rounded-md border border-amber-700/40 bg-amber-950/20 p-3">
                    <p class="font-medium text-amber-200">Couldn't reach {warWeightResult.failedClans.length} clan on the server</p>
                    <p class="text-xs text-stone-400">
                        Open each link, copy the whole JSON, paste it below and apply. One clan at a time is fine — repeat for each.
                    </p>
                    <div class="flex flex-col gap-1">
                        {#each warWeightResult.failedClans as clan (clan.tag)}
                            <a
                                href={fwaMembersUrl(clan.tag)}
                                target="_blank"
                                rel="noopener noreferrer"
                                class="flex items-center justify-between gap-3 rounded px-2 py-1 text-stone-200 hover:bg-stone-800/60"
                            >
                                <span class="truncate">{clan.name ?? clan.tag}</span>
                                <span class="shrink-0 font-mono text-xs text-sky-400 underline">{clan.tag}</span>
                            </a>
                        {/each}
                    </div>
                    <textarea
                        bind:value={pastedFwa}
                        placeholder="Paste a clan's Members.json here…"
                        rows="4"
                        class="mt-1 w-full resize-y rounded-lg border-2 border-stone-700/50 bg-stone-900 px-3 py-2 font-mono text-xs text-stone-50 transition-colors duration-200 ease-in-out outline-none placeholder:text-stone-400 focus-visible:border-stone-700 focus-visible:ring-4 focus-visible:ring-stone-700/50"
                    ></textarea>
                    <div class="flex justify-end">
                        <Button variant="base" size="sm" disabled={applyingPaste || !pastedFwa.trim()} onclick={applyPastedFwa}>
                            {#if applyingPaste}
                                <SvgSpinnersRingResize class="size-4" />
                            {:else}
                                Apply pasted roster
                            {/if}
                        </Button>
                    </div>
                </div>
            {/if}
            <div class="flex flex-col gap-1">
                <div class="flex items-center justify-between gap-2">
                    <p class="font-medium text-stone-100">Not on FWA ({warWeightResult.notInFwa.length})</p>
                    {#if warWeightResult.notInFwa.length}
                        <Button
                            variant={copied["notInFwa"] ? "success" : "ghost"}
                            size="icon"
                            tooltip={copied["notInFwa"] ? "Copied!" : "Copy name + tag"}
                            tooltipPlacement="top"
                            onclick={() =>
                                copyList(
                                    warWeightResult!.notInFwa.map((a) => ({ name: a.ownerName ?? "", tag: a.cocAccountTag })),
                                    "notInFwa",
                                )}
                        >
                            {#if copied["notInFwa"]}
                                <TablerCheck />
                            {:else}
                                <TablerCopy />
                            {/if}
                        </Button>
                    {/if}
                </div>
                <p class="text-xs text-stone-400">Linked main accounts with no war weight in any JPA clan's FWA roster.</p>
                {#if warWeightResult.notInFwa.length}
                    <div class="mt-1 max-h-40 divide-y divide-stone-800 overflow-y-auto rounded-md border border-stone-700/50 bg-stone-950/40">
                        {#each warWeightResult.notInFwa as a (a.cocAccountTag)}
                            <div class="flex items-center justify-between gap-3 px-3 py-1.5">
                                <span class="truncate text-stone-200">{a.ownerName ?? "—"}</span>
                                <span class="shrink-0 font-mono text-xs text-stone-400">{a.cocAccountTag}</span>
                            </div>
                        {/each}
                    </div>
                {:else}
                    <p class="text-xs text-stone-500">Every linked main account got a war weight.</p>
                {/if}
            </div>
        </div>
    {/if}
</Dialog>

<Dialog
    bind:open={addOpen}
    title="Add an account"
    description="Manually link a Clash of Clans account to a member. No API token is required — staff use only."
    confirmText={addSubmitting ? "Adding…" : "Add account"}
    onConfirm={submitAdd}
>
    <div class="flex flex-col gap-4">
        <div class="flex flex-col gap-1">
            <p class="text-sm font-medium">Member</p>
            <UserCombobox bind:value={addSelectedUser} search={searchUsers} placeholder="Search by name or Discord id…" />
        </div>

        <div class="flex flex-col gap-1">
            <p class="text-sm font-medium">Account tag</p>
            <Input placeholder="#ABC123XYZ" bind:value={addTag} />
        </div>

        <div class="flex flex-col gap-1">
            <p class="text-sm font-medium">War weight</p>
            <Input type="number" min={0} bind:value={addWarWeight} />
        </div>

        <div class="flex items-center justify-between gap-3 border-t border-stone-800 pt-3">
            <div class="flex min-w-0 flex-col">
                <p class="text-sm font-medium">External</p>
                <p class="text-xs text-stone-400">Account only brought for CWL.</p>
            </div>
            <Toggle bind:checked={addExternal} />
        </div>
    </div>
</Dialog>
