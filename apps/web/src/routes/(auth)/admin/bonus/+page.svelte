<script lang="ts">
    import { PUBLIC_SERVER_URL } from "$env/static/public";
    import CocAccountSidebar from "$lib/components/CocAccountSidebar.svelte";
    import BonusAccountCell from "$lib/components/grid/BonusAccountCell.svelte";
    import ClanCell from "$lib/components/grid/ClanCell.svelte";
    import CwlDiscordCell from "$lib/components/grid/CwlDiscordCell.svelte";
    import Badge from "$lib/components/ui/Badge.svelte";
    import Button from "$lib/components/ui/Button.svelte";
    import ConfirmationDialog from "$lib/components/ui/ConfirmationDialog.svelte";
    import Grid from "$lib/components/ui/Grid.svelte";
    import { svelteRenderer } from "$lib/components/ui/grid/SvelteCellRenderer";
    import Input from "$lib/components/ui/Input.svelte";
    import type { Option } from "$lib/components/ui/Select.svelte";
    import Seo from "$lib/components/ui/Seo.svelte";
    import { Sidebar } from "$lib/components/ui/sidebar";
    import { fadeIn } from "$lib/utils/animations";
    import {
        assignCwlApplication,
        getBonusData,
        getBonusHistory,
        getJPAClans,
        getJPACwlClans,
        removeBonusMonth,
        setAccountMonthSelection,
        updateCocAccountStats,
        updateCocAccountWarWeight,
        type GetBonusData200,
    } from "@repo/clashofclans-client";
    import type { ColDef, GridApi, ICellRendererParams } from "ag-grid-community";
    import type { Component } from "svelte";
    import { toast } from "svelte-sonner";
    import SvgSpinnersRingResize from "~icons/svg-spinners/ring-resize";
    import TablerCheck from "~icons/tabler/check";
    import TablerDownload from "~icons/tabler/download";
    import TablerPlus from "~icons/tabler/plus";
    import TablerSearch from "~icons/tabler/search";
    import TablerShield from "~icons/tabler/shield";
    import TablerStar from "~icons/tabler/star";
    import TablerX from "~icons/tabler/x";

    type BonusRow = GetBonusData200["data"]["rows"][number];
    // Each grid row also carries its CWL bonus: the set of ticked months (the
    // checkbox columns), stored in cwlBonusTable per account.
    type Row = BonusRow & { bonusMonths: string[] };

    const ALL_MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"] as const;
    type Month = (typeof ALL_MONTHS)[number];
    const sortMonths = (m: string[]) => [...m].sort((a, b) => ALL_MONTHS.indexOf(a as Month) - ALL_MONTHS.indexOf(b as Month));

    let rows = $state<Row[]>([]);
    // Active month columns, derived from the data on load and grown/shrunk via the
    // quick month buttons. A freshly-added month with no ticks is local-only.
    let months = $state<string[]>([]);
    let total = $state(0);
    let loading = $state(true);
    let downloading = $state(false);
    let searchText = $state("");

    let gridApi = $state<GridApi | null>(null);

    // Tag -> name lookups for the clan cells. The "Clan" column holds the JPA clan
    // the account applied with; the "Assigned clan" column holds a CWL clan.
    let clanNameByTag = $state<Record<string, string>>({});
    let cwlClanOptions = $state<Option[]>([{ label: "Unassigned", value: "" }]);
    let cwlClanNameByTag = $state<Record<string, string>>({});

    // CoC account detail sidebar (opened from the COC account cell's eye button).
    let accountSidebar: Sidebar | null = $state(null);
    let selectedAccount = $state<Record<string, unknown> | null>(null);
    const gridContext = {
        openAccountSidebar: (account: Record<string, unknown>) => {
            selectedAccount = account;
            accountSidebar?.open(String(account.cocAccountId));
        },
    };

    const normalizeTag = (tag: string | null | undefined) => (tag ?? "").trim().toUpperCase();

    // Stat columns edited inline; mirror the COC accounts admin page (a later
    // Google Sheet sync will overwrite these manual edits).
    const STAT_FIELDS = ["totalDonated", "totalReceived", "clanGames", "capitalGoldLooted", "capitalGoldContributed", "activityScore"] as const;

    function clanLabel(clanTag: string | null | undefined): string {
        if (!clanTag) return "Unassigned";
        return cwlClanOptions.find((o) => o.value === clanTag)?.label ?? clanTag;
    }

    function applySearch() {
        gridApi?.setGridOption("quickFilterText", searchText);
    }

    // Filter/sort presets, toggled via the badge buttons. Multiple can be active
    // at once. "jpaClan" and "priority1" are row filters; "mostDonated" re-sorts
    // the remaining rows by highest donations (mirrors the bonus eligibility flow).
    type PresetKey = "jpaClan" | "priority1";
    const PRESETS: { key: PresetKey; label: string; icon: Component; variant: "green" | "yellow" }[] = [
        { key: "jpaClan", label: "In a JPA clan", icon: TablerShield, variant: "green" },
        { key: "priority1", label: "Preference 1", icon: TablerStar, variant: "yellow" },
    ];
    let presets = $state<Record<PresetKey, boolean>>({ jpaClan: false, priority1: false });
    let displayedCount = $state(0);

    // JPA clan membership is matched against the account's current clan (synced
    // from the sheet), comparing case-insensitively against both name and tag.
    let jpaClanKeys = $derived(new Set(Object.entries(clanNameByTag).flatMap(([tag, name]) => [tag.toLowerCase(), name.toLowerCase()])));
    const isInJpaClan = (currentClan: string | null | undefined) => !!currentClan && jpaClanKeys.has(currentClan.trim().toLowerCase());

    function rowPassesPresets(d: BonusRow): boolean {
        if (presets.priority1 && d.preferenceNum !== 1) return false;
        if (presets.jpaClan && !isInJpaClan(d.currentClan)) return false;
        return true;
    }

    // Re-run the grid's external filter whenever a filter preset toggles.
    $effect(() => {
        presets.jpaClan;
        presets.priority1;
        gridApi?.onFilterChanged();
    });

    // Rows are grouped by assigned clan; alternate a subtle background band per
    // contiguous clan group so neighbouring clans are easy to tell apart. The
    // parity is derived from the *displayed* order, so it stays correct after a
    // re-sort, filter or edit. Keyed by row id; getRowClass reads it on render.
    let bandByRowId = new Map<string, number>();

    function recomputeBands(api: GridApi): boolean {
        const order: { id: string; tag: string }[] = [];
        api.forEachNodeAfterFilterAndSort((node) => {
            if (node.data) order.push({ id: String(node.id), tag: normalizeTag(node.data.assignedTo) });
        });

        // Only band when rows are grouped by clan (each tag forms one contiguous
        // run). When sorted some other way (e.g. the "most donated" preset), the
        // banding would just be noise, so we leave it off.
        const seen = new Set<string>();
        let grouped = true;
        let prev: string | null = null;
        for (const { tag } of order) {
            if (tag === prev) continue;
            if (seen.has(tag)) {
                grouped = false;
                break;
            }
            seen.add(tag);
            prev = tag;
        }

        const next = new Map<string, number>();
        if (grouped) {
            let band = 0;
            let prevTag: string | null = null;
            let first = true;
            for (const { id, tag } of order) {
                if (first) first = false;
                else if (tag !== prevTag) band ^= 1;
                prevTag = tag;
                next.set(id, band);
            }
        }

        if (next.size === bandByRowId.size && [...next].every(([k, v]) => bandByRowId.get(k) === v)) return false;
        bandByRowId = next;
        return true;
    }

    async function loadClans() {
        try {
            const resp = await getJPAClans({ baseURL: PUBLIC_SERVER_URL, credentials: "include" });
            if (resp.success) {
                clanNameByTag = Object.fromEntries(Object.values(resp.data.clans).map((c) => [normalizeTag(c.clanTag), c.clanName ?? c.clanTag]));
            }
        } catch {
            // Clan cells fall back to showing the raw tag.
        }
    }

    async function loadCwlClans() {
        try {
            const resp = await getJPACwlClans({ baseURL: PUBLIC_SERVER_URL, credentials: "include" });
            if (resp.success) {
                const clans = Object.values(resp.data.clans);
                cwlClanOptions = [
                    { label: "Unassigned", value: "" },
                    ...clans.map((c) => ({ label: `${c.clanName} (${c.clanTag})`, value: c.clanTag })),
                ];
                cwlClanNameByTag = Object.fromEntries(clans.map((c) => [normalizeTag(c.clanTag), c.clanName]));
            }
        } catch {
            // Assigned-clan editor still works without resolved names.
        }
    }

    async function load() {
        loading = true;
        try {
            const [bd, bh] = await Promise.all([
                getBonusData({ baseURL: PUBLIC_SERVER_URL, credentials: "include" }),
                getBonusHistory({ baseURL: PUBLIC_SERVER_URL, credentials: "include" }),
            ]);
            if (!bd.success) {
                toast.error("Failed to load bonus data");
                return;
            }
            const bonusByTag = new Map((bh.success ? bh.data.bonuses : []).map((b) => [b.cocAccountTag, b]));
            rows = bd.data.rows.map((r) => {
                const b = bonusByTag.get(r.cocAccountTag);
                return { ...r, bonusMonths: b?.months ?? [] };
            });
            total = bd.data.total;
            // Show every month that already has at least one tick.
            months = sortMonths([...new Set((bh.success ? bh.data.bonuses : []).flatMap((b) => b.months))]);
        } catch (error) {
            toast.error("Failed to load bonus data", { description: error instanceof Error ? error.message : undefined });
        } finally {
            loading = false;
        }
    }

    // Horizontal drag-to-scroll for the months bar (mirrors the CWL applications page).
    let monthsScrollEl = $state<HTMLDivElement | null>(null);
    let isDragging = $state(false);
    let hasDragged = false;
    let dragStartX = 0;
    let dragScrollLeft = 0;
    let dragCursorStyle: HTMLStyleElement | null = null;

    // Suppress the click that fires at the end of a drag-scroll so badges don't toggle.
    $effect(() => {
        const el = monthsScrollEl;
        if (!el) return;
        function suppressClick(e: MouseEvent) {
            if (hasDragged) {
                e.stopPropagation();
                e.preventDefault();
                hasDragged = false;
            }
        }
        el.addEventListener("click", suppressClick, { capture: true });
        return () => el.removeEventListener("click", suppressClick, { capture: true });
    });

    function onDragStart(e: MouseEvent) {
        if (!monthsScrollEl) return;
        isDragging = true;
        hasDragged = false;
        dragStartX = e.pageX - monthsScrollEl.offsetLeft;
        dragScrollLeft = monthsScrollEl.scrollLeft;
        dragCursorStyle = document.createElement("style");
        dragCursorStyle.textContent = "* { cursor: grabbing !important; }";
        document.head.appendChild(dragCursorStyle);
        document.addEventListener("mousemove", onDragMove);
        document.addEventListener("mouseup", onDragEnd);
    }

    function onDragMove(e: MouseEvent) {
        if (!isDragging || !monthsScrollEl) return;
        e.preventDefault();
        const dx = e.pageX - monthsScrollEl.offsetLeft - dragStartX;
        if (Math.abs(dx) > 4) hasDragged = true;
        monthsScrollEl.scrollLeft = dragScrollLeft - dx;
    }

    function onDragEnd() {
        isDragging = false;
        dragCursorStyle?.remove();
        dragCursorStyle = null;
        document.removeEventListener("mousemove", onDragMove);
        document.removeEventListener("mouseup", onDragEnd);
    }

    // Surfaces a month column so accounts can be ticked for it. Adding is local —
    // it persists once a tick is saved against it.
    function addMonth(month: string) {
        if (!months.includes(month)) months = sortMonths([...months, month]);
    }

    // Removes a month column and clears every account's tick for it.
    async function removeMonth(month: Month) {
        months = months.filter((m) => m !== month);
        rows = rows.map((r) => (r.bonusMonths.includes(month) ? { ...r, bonusMonths: r.bonusMonths.filter((m) => m !== month) } : r));
        try {
            const resp = await removeBonusMonth(month, { baseURL: PUBLIC_SERVER_URL, credentials: "include" });
            if (!resp.success) throw new Error();
            toast.success(`${month} removed`);
        } catch (error) {
            toast.error(`Failed to remove ${month}`, { description: error instanceof Error ? error.message : undefined });
            load();
        }
    }

    async function assign(id: number, clanTag: string) {
        try {
            const resp = await assignCwlApplication(
                id,
                { clanTag: clanTag || null },
                { baseURL: PUBLIC_SERVER_URL, credentials: "include", headers: { "Content-Type": "application/json" } },
            );
            if (resp.success) {
                toast.success(clanTag ? `Bonus clan set to ${clanLabel(clanTag)}` : "Bonus clan cleared");
                return resp.data.application.assignedTo ?? "";
            }
            toast.error("Failed to update bonus clan");
        } catch (error) {
            toast.error("Failed to update bonus clan", { description: error instanceof Error ? error.message : undefined });
        }
        return null;
    }

    // Wraps a CSV cell so commas, quotes and newlines survive a round-trip.
    function csvCell(value: unknown): string {
        const s = value == null ? "" : String(value);
        return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    }

    const CSV_COLUMNS: { header: string; field: keyof BonusRow }[] = [
        { header: "Discord", field: "discordUsername" },
        { header: "Discord ID", field: "discordUserId" },
        { header: "Account", field: "cocAccountName" },
        { header: "Tag", field: "cocAccountTag" },
        { header: "Clan", field: "cocAccountClan" },
        { header: "Preference", field: "preferenceNum" },
        { header: "War Weight", field: "warWeight" },
        { header: "Assigned Clan", field: "assignedTo" },
        { header: "Town Hall", field: "townHall" },
        { header: "Total Donated", field: "totalDonated" },
        { header: "Total Received", field: "totalReceived" },
        { header: "Clan Games", field: "clanGames" },
        { header: "Capital Gold Looted", field: "capitalGoldLooted" },
        { header: "Capital Gold Contributed", field: "capitalGoldContributed" },
        { header: "Activity Score", field: "activityScore" },
    ];

    function downloadCsv() {
        downloading = true;
        try {
            const lines = [
                CSV_COLUMNS.map((c) => csvCell(c.header)).join(","),
                ...rows.map((r) =>
                    CSV_COLUMNS.map((c) => {
                        if (c.field === "cocAccountClan") return csvCell(clanNameByTag[normalizeTag(r.cocAccountClan)] ?? r.cocAccountClan ?? "");
                        if (c.field === "assignedTo")
                            return csvCell(r.assignedTo ? (cwlClanNameByTag[normalizeTag(r.assignedTo)] ?? r.assignedTo) : "");
                        return csvCell(r[c.field]);
                    }).join(","),
                ),
            ];
            const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `cwl-bonus-${new Date().toISOString().slice(0, 10)}.csv`;
            a.click();
            URL.revokeObjectURL(url);
            toast.success(`Exported ${rows.length} row${rows.length === 1 ? "" : "s"}`);
        } catch (error) {
            toast.error("Failed to export CSV", { description: error instanceof Error ? error.message : undefined });
        } finally {
            downloading = false;
        }
    }

    const formatNumber = (p: { value: unknown }) => (p.value != null ? Number(p.value).toLocaleString() : "");

    // One checkbox column per active month; the tick lives in the row's bonusMonths.
    let monthCols = $derived<ColDef[]>(
        months.map((m) => ({
            headerName: m,
            colId: `month_${m}`,
            width: 84,
            sortable: true,
            filter: false,
            editable: true,
            cellRenderer: "agCheckboxCellRenderer",
            cellEditor: "agCheckboxCellEditor",
            valueGetter: (p) => (p.data as Row | undefined)?.bonusMonths?.includes(m) ?? false,
            valueSetter: (p) => {
                const data = p.data as Row;
                const has = data.bonusMonths.includes(m);
                const want = Boolean(p.newValue);
                if (has === want) return false;
                data.bonusMonths = want ? [...data.bonusMonths, m] : data.bonusMonths.filter((x) => x !== m);
                return true;
            },
        })),
    );

    load();
    loadClans();
    loadCwlClans();

    // Re-render the clan cells once the tag -> name maps resolve.
    $effect(() => {
        clanNameByTag;
        cwlClanNameByTag;
        gridApi?.refreshCells({ force: true, columns: ["cocAccountClan", "assignedTo"] });
    });
</script>

<Seo title="CWL Bonus" description="Assign CWL bonuses and review linked account stats." />

<div in:fadeIn class="relative flex size-full flex-col gap-4 overflow-hidden">
    <div class="flex flex-col gap-2 px-4 pt-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
            <h1 class="text-2xl font-bold">CWL Bonus</h1>
            <p class="text-sm text-stone-400">
                {#if loading}
                    Loading…
                {:else if presets.jpaClan || presets.priority1 || searchText.trim()}
                    {displayedCount} of {total} entr{total === 1 ? "y" : "ies"}
                {:else}
                    {total} entr{total === 1 ? "y" : "ies"}
                {/if}
            </p>
        </div>
        <div class="flex w-full items-center gap-2 lg:w-auto">
            <Input placeholder="Search anything..." bind:value={searchText} oninput={applySearch} class="min-w-0 flex-1 lg:w-80 lg:flex-none" />
            <Button variant="success" class="shrink-0" onclick={applySearch} tooltip="Search" tooltipPlacement="bottom">
                <TablerSearch class="size-5" />
            </Button>
            <Button
                variant="base"
                class="shrink-0"
                disabled={downloading || rows.length === 0}
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
    </div>

    <div class="flex flex-wrap items-center gap-2 px-4">
        <span class="mr-1 text-xs font-medium text-stone-400">Presets</span>
        {#each PRESETS as preset (preset.key)}
            <Badge
                icon={preset.icon}
                content={preset.label}
                variant={presets[preset.key] ? preset.variant : "ghost"}
                iconSize="size-4"
                onclick={() => (presets[preset.key] = !presets[preset.key])}
                class="px-2 py-1 font-medium {presets[preset.key] ? '' : 'opacity-60 hover:opacity-100'}"
            />
        {/each}
        {#if presets.jpaClan || presets.priority1}
            <Badge
                icon={TablerX}
                content="Clear"
                variant="ghost"
                iconSize="size-4"
                onclick={() => (presets = { jpaClan: false, priority1: false })}
                class="px-2 py-1 font-medium"
            />
        {/if}
    </div>

    <div class="flex items-center gap-2 px-4">
        <span class="shrink-0 text-xs font-medium text-stone-400">Months</span>
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <div
            bind:this={monthsScrollEl}
            onmousedown={onDragStart}
            class="edge-fade flex cursor-grab items-center gap-2 overflow-x-auto [&::-webkit-scrollbar]:hidden {isDragging ? 'select-none' : ''}"
            style="scrollbar-width: none;"
        >
            {#each ALL_MONTHS as m (m)}
                {#if months.includes(m)}
                    <ConfirmationDialog
                        title="Remove {m}?"
                        description="This unticks {m} for every account and removes the column."
                        confirmText="Remove"
                        onConfirm={() => removeMonth(m)}
                        class="shrink-0"
                    >
                        <Badge variant="green" content={m} icon={TablerCheck} iconSize="size-4" class="px-2 py-1 font-medium" />
                    </ConfirmationDialog>
                {:else}
                    <Badge
                        variant="ghost"
                        content={m}
                        icon={TablerPlus}
                        iconSize="size-4"
                        onclick={() => addMonth(m)}
                        class="px-2 py-1 font-medium opacity-60 hover:opacity-100"
                    />
                {/if}
            {/each}
        </div>
    </div>

    <div class="flex-1">
        <Grid
            rowData={rows}
            gridOptions={{
                context: gridContext,
                rowHeight: 56,
                getRowId: (p) => String(p.data.id),
                // Alternating band per assigned-clan group (see recomputeBands).
                getRowClass: (p) => (p.node.id && bandByRowId.get(p.node.id) === 1 ? "bonus-band" : undefined),
                // Preset filters run as a grid external filter, composing with the search box.
                isExternalFilterPresent: () => presets.jpaClan || presets.priority1,
                doesExternalFilterPass: (node) => !node.data || rowPassesPresets(node.data),
                onModelUpdated: (event) => {
                    displayedCount = event.api.getDisplayedRowCount();
                    // Recompute bands from the new displayed order; redraw only if they changed.
                    if (recomputeBands(event.api)) event.api.redrawRows();
                },
                onGridReady: (params) => {
                    gridApi = params.api;
                },
                onCellValueChanged: async (event) => {
                    if (event.oldValue === event.newValue) return;
                    const field = event.colDef.field;

                    // Month checkbox toggled (colId is `month_<MON>`).
                    if (event.colDef.colId?.startsWith("month_")) {
                        const month = event.colDef.colId.slice("month_".length) as Month;
                        const selected = Boolean(event.newValue);
                        try {
                            const resp = await setAccountMonthSelection(
                                { cocAccountTag: event.data.cocAccountTag, discordUserId: event.data.discordUserId, month, selected },
                                { baseURL: PUBLIC_SERVER_URL, credentials: "include", headers: { "Content-Type": "application/json" } },
                            );
                            if (!resp.success) throw new Error();
                            toast.success(`${month} ${selected ? "ticked" : "unticked"} for ${event.data.cocAccountName}`);
                        } catch (error) {
                            event.data.bonusMonths = selected
                                ? event.data.bonusMonths.filter((x: string) => x !== month)
                                : [...event.data.bonusMonths, month];
                            event.api.refreshCells({ rowNodes: [event.node], columns: [event.colDef.colId], force: true });
                            toast.error(`Failed to update ${month}`, { description: error instanceof Error ? error.message : undefined });
                        }
                        return;
                    }

                    if (field === "warWeight") {
                        const warWeight = Number(event.newValue);
                        if (!Number.isInteger(warWeight) || warWeight < 0) {
                            toast.error("War weight must be a non-negative whole number");
                            event.data.warWeight = event.oldValue;
                            event.api.refreshCells({ rowNodes: [event.node], columns: ["warWeight"], force: true });
                            return;
                        }
                        try {
                            const resp = await updateCocAccountWarWeight(
                                event.data.cocAccountId,
                                { warWeight },
                                { baseURL: PUBLIC_SERVER_URL, credentials: "include", headers: { "Content-Type": "application/json" } },
                            );
                            if (resp.success) {
                                event.data.warWeight = resp.data.account.warWeight;
                                toast.success(`War weight updated for ${event.data.cocAccountName}`);
                            } else {
                                throw new Error();
                            }
                        } catch (error) {
                            toast.error("Failed to update war weight", { description: error instanceof Error ? error.message : undefined });
                            event.data.warWeight = event.oldValue;
                        }
                        event.api.refreshCells({ rowNodes: [event.node], columns: ["warWeight"], force: true });
                        return;
                    }

                    if (field === "assignedTo") {
                        const result = await assign(event.data.id, event.newValue || "");
                        event.data.assignedTo = result ?? event.oldValue;
                        // Re-sort so the row jumps into its new clan group; this fires
                        // onModelUpdated, which recomputes the alternating bands.
                        event.api.applyTransaction({ update: [event.data] });
                        return;
                    }

                    if (field && (STAT_FIELDS as readonly string[]).includes(field)) {
                        const n = Number(event.newValue);
                        if (!Number.isInteger(n) || n < 0) {
                            toast.error(`${event.colDef.headerName} must be a non-negative whole number`);
                            event.data[field] = event.oldValue;
                            event.api.refreshCells({ rowNodes: [event.node], columns: [field], force: true });
                            return;
                        }
                        try {
                            const resp = await updateCocAccountStats(
                                event.data.cocAccountId,
                                { [field]: n },
                                { baseURL: PUBLIC_SERVER_URL, credentials: "include", headers: { "Content-Type": "application/json" } },
                            );
                            if (resp.success) {
                                event.data[field] = (resp.data.account as Record<string, unknown>)[field];
                                toast.success(`${event.colDef.headerName} updated for ${event.data.cocAccountName}`);
                            } else {
                                throw new Error();
                            }
                        } catch (error) {
                            toast.error(`Failed to update ${event.colDef.headerName?.toLowerCase()}`, {
                                description: error instanceof Error ? error.message : undefined,
                            });
                            event.data[field] = event.oldValue;
                        }
                        event.api.refreshCells({ rowNodes: [event.node], columns: [field], force: true });
                        return;
                    }
                },
            }}
            columnDefs={[
                {
                    headerName: "Discord",
                    field: "discordUsername",
                    sortable: true,
                    filter: false,
                    flex: 2,
                    minWidth: 200,
                    cellRenderer: svelteRenderer(CwlDiscordCell),
                    getQuickFilterText: (p) => `${p.data.discordUsername} ${p.data.discordUserId}`,
                },
                {
                    headerName: "COC Account",
                    field: "cocAccountName",
                    sortable: true,
                    filter: false,
                    flex: 2,
                    minWidth: 240,
                    cellRenderer: svelteRenderer(BonusAccountCell),
                    getQuickFilterText: (p) => `${p.data.cocAccountName} ${p.data.cocAccountTag}`,
                },
                {
                    headerName: "Clan",
                    field: "cocAccountClan",
                    sortable: true,
                    filter: false,
                    flex: 2,
                    minWidth: 180,
                    cellRenderer: svelteRenderer(ClanCell),
                    cellRendererParams: (p: ICellRendererParams) => ({ clanName: clanNameByTag[normalizeTag(p.value)] ?? null }),
                    getQuickFilterText: (p) => `${clanNameByTag[normalizeTag(p.value)] ?? ""} ${p.value ?? ""}`.trim(),
                },
                { headerName: "Pref.", field: "preferenceNum", sortable: true, filter: false, width: 90 },
                {
                    headerName: "War Weight",
                    field: "warWeight",
                    sortable: true,
                    filter: false,
                    flex: 1,
                    minWidth: 120,
                    // Secondary sort: heaviest weight first within each clan group.
                    sort: "desc",
                    sortIndex: 1,
                    editable: true,
                    cellEditor: "uiInputEditor",
                    cellEditorParams: { type: "number" },
                    valueParser: (p) => Number(p.newValue),
                    valueFormatter: formatNumber,
                },
                {
                    headerName: "Assigned Clan",
                    field: "assignedTo",
                    sortable: true,
                    filter: false,
                    flex: 2,
                    minWidth: 180,
                    // Primary sort: groups rows by their assigned bonus clan.
                    sort: "asc",
                    sortIndex: 0,
                    editable: true,
                    cellEditorPopup: true,
                    cellEditor: "uiSelectEditor",
                    cellEditorParams: () => ({ options: cwlClanOptions }),
                    cellRenderer: svelteRenderer(ClanCell),
                    cellRendererParams: (p: ICellRendererParams) => ({
                        clanName: p.value ? (cwlClanNameByTag[normalizeTag(p.value)] ?? null) : null,
                    }),
                    valueGetter: (p) => p.data?.assignedTo ?? "",
                    getQuickFilterText: (p) => clanLabel(p.value),
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
                ...monthCols,
            ]}
        />
    </div>
</div>

<Sidebar bind:this={accountSidebar}>
    {#if selectedAccount}
        <CocAccountSidebar account={selectedAccount as any} />
    {/if}
</Sidebar>

<style>
    /* Alternating clan-group band. Skips hover/selected rows so those native
       states still show through. Themed with the Stone palette. */
    :global(.ag-theme-quartz .ag-row.bonus-band:not(.ag-row-hover):not(.ag-row-selected)) {
        background-color: color-mix(in srgb, var(--color-stone-700) 16%, transparent);
    }
</style>
