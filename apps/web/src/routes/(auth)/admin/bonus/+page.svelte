<script lang="ts">
    import { PUBLIC_SERVER_URL } from "$env/static/public";
    import CocAccountSidebar from "$lib/components/CocAccountSidebar.svelte";
    import BonusAccountCell from "$lib/components/grid/BonusAccountCell.svelte";
    import BonusSeasonsCell from "$lib/components/grid/BonusSeasonsCell.svelte";
    import ClanCell from "$lib/components/grid/ClanCell.svelte";
    import CwlStarsCell from "$lib/components/grid/CwlStarsCell.svelte";
    import CwlDiscordCell from "$lib/components/grid/CwlDiscordCell.svelte";
    import Badge from "$lib/components/ui/Badge.svelte";
    import Button from "$lib/components/ui/Button.svelte";
    import Grid from "$lib/components/ui/Grid.svelte";
    import { svelteRenderer } from "$lib/components/ui/grid/SvelteCellRenderer";
    import Input from "$lib/components/ui/Input.svelte";
    import Select, { type Option } from "$lib/components/ui/Select.svelte";
    import Seo from "$lib/components/ui/Seo.svelte";
    import { Sidebar } from "$lib/components/ui/sidebar";
    import { fadeIn } from "$lib/utils/animations";
    import {
        assignCwlApplication,
        getBonusData,
        getBonusLedger,
        getCwlSeasons,
        getCwlStats,
        getJPAClans,
        getJPACwlClans,
        setUserSeasonBonus,
        updateCocAccountStats,
        updateCocAccountWarWeight,
        updateCwlApplicationNotes,
        type GetBonusData200,
        type GetCwlSeasons200,
        type GetCwlStats200,
    } from "@repo/clashofclans-client";
    import type { GridApi, ICellRendererParams } from "ag-grid-community";
    import type { Component } from "svelte";
    import { toast } from "svelte-sonner";
    import SvgSpinnersRingResize from "~icons/svg-spinners/ring-resize";
    import TablerDownload from "~icons/tabler/download";
    import TablerSearch from "~icons/tabler/search";
    import TablerStar from "~icons/tabler/star";
    import TablerSwords from "~icons/tabler/swords";
    import TablerX from "~icons/tabler/x";

    type BonusRow = GetBonusData200["data"]["rows"][number];
    type Season = GetCwlSeasons200["data"]["seasons"][number];
    type CwlStat = GetCwlStats200["data"]["stats"][number];
    // A bonus is per Discord user per season; each row carries the set of season
    // ids its owner has been awarded (shared across that user's accounts). CWL
    // attacks/stars are live-fetched on demand.
    type Row = BonusRow & { bonusSeasonIds: number[]; cwlAttacks?: number; cwlStars?: number; cwlDetails?: CwlStat["details"] };

    let rows = $state<Row[]>([]);
    let seasons = $state<Season[]>([]);
    let currentSeasonId = $state<number | null>(null);
    let currentSeasonName = $derived(seasons.find((s) => s.id === currentSeasonId)?.name ?? null);
    // Split the season columns: the active season (awarded now) vs. all the rest.
    let currentSeasonList = $derived(seasons.filter((s) => s.id === currentSeasonId));
    let pastSeasons = $derived(seasons.filter((s) => s.id !== currentSeasonId));
    let selectedSeasonValue = $state("");
    let seasonOptions = $derived<Option[]>(seasons.map((s) => ({ label: s.name, value: String(s.id) })));
    let total = $state(0);
    let loading = $state(true);
    let downloading = $state(false);
    let fetchingCwl = $state(false);
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

    // Filter/sort presets, toggled via the badge buttons.
    type PresetKey = "priority1" | "fullAttacks";
    const PRESETS: { key: PresetKey; label: string; icon: Component; variant: "green" | "yellow" }[] = [
        { key: "priority1", label: "Preference 1", icon: TablerStar, variant: "yellow" },
        { key: "fullAttacks", label: "7/7 attacks", icon: TablerSwords, variant: "green" },
    ];
    let presets = $state<Record<PresetKey, boolean>>({ priority1: false, fullAttacks: false });
    let displayedCount = $state(0);

    function rowPassesPresets(d: Row): boolean {
        if (presets.priority1 && d.preferenceNum !== 1) return false;
        if (presets.fullAttacks && d.cwlAttacks !== 7) return false;
        return true;
    }

    // Re-run the grid's external filter whenever a filter preset toggles.
    $effect(() => {
        presets.priority1;
        presets.fullAttacks;
        gridApi?.onFilterChanged();
    });

    // Rows are grouped by assigned clan; alternate a subtle background band per
    // contiguous clan group so neighbouring clans are easy to tell apart. The
    // parity is derived from the *displayed* order, so it stays correct after a
    // re-sort, filter or edit. Keyed by row id; getRowClass reads it on render.
    let bandByRowId = new Map<string, number>();
    // First row id of each clan group (gets a top-border divider).
    let dividerRowIds = new Set<string>();

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
        const nextDividers = new Set<string>();
        if (grouped) {
            let band = 0;
            let prevTag: string | null = null;
            let first = true;
            for (const { id, tag } of order) {
                if (first) first = false;
                else if (tag !== prevTag) {
                    band ^= 1;
                    nextDividers.add(id);
                }
                prevTag = tag;
                next.set(id, band);
            }
        }

        const bandsSame = next.size === bandByRowId.size && [...next].every(([k, v]) => bandByRowId.get(k) === v);
        const dividersSame = nextDividers.size === dividerRowIds.size && [...nextDividers].every((id) => dividerRowIds.has(id));
        if (bandsSame && dividersSame) return false;
        bandByRowId = next;
        dividerRowIds = nextDividers;
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

    async function load(seasonId?: number) {
        loading = true;
        try {
            const [bd, bl, ss] = await Promise.all([
                getBonusData({ seasonId }, { baseURL: PUBLIC_SERVER_URL, credentials: "include" }),
                getBonusLedger({ baseURL: PUBLIC_SERVER_URL, credentials: "include" }),
                getCwlSeasons({ baseURL: PUBLIC_SERVER_URL, credentials: "include" }),
            ]);
            if (!bd.success) {
                toast.error("Failed to load bonus data");
                return;
            }
            seasons = ss.success ? ss.data.seasons : [];
            // Bonus is per Discord user: collect the season ids each user has earned,
            // so all of that user's accounts render the same ticks.
            const seasonsByUser = new Map<string, number[]>();
            if (bl.success) {
                for (const b of bl.data.bonuses) {
                    const list = seasonsByUser.get(b.discordUserId) ?? [];
                    list.push(b.seasonId);
                    seasonsByUser.set(b.discordUserId, list);
                }
            }
            rows = bd.data.rows.map((r) => ({ ...r, bonusSeasonIds: seasonsByUser.get(r.discordUserId) ?? [] }));
            total = bd.data.total;
            currentSeasonId = bd.data.seasonId;
            selectedSeasonValue = currentSeasonId != null ? String(currentSeasonId) : "";
        } catch (error) {
            toast.error("Failed to load bonus data", { description: error instanceof Error ? error.message : undefined });
        } finally {
            loading = false;
        }
    }

    // Live-fetches CWL attacks/stars for the roster's season (assigned clans only)
    // and merges them onto the rows; nothing is persisted.
    async function fetchCwlStats() {
        fetchingCwl = true;
        try {
            const resp = await getCwlStats({ seasonId: currentSeasonId ?? undefined }, { baseURL: PUBLIC_SERVER_URL, credentials: "include" });
            if (!resp.success) throw new Error();
            const byTag = new Map(resp.data.stats.map((s) => [s.tag.toUpperCase(), s]));
            for (const r of rows) {
                const s = byTag.get(normalizeTag(r.cocAccountTag));
                r.cwlAttacks = s?.attacks ?? 0;
                r.cwlStars = s?.stars ?? 0;
                r.cwlDetails = s?.details ?? [];
            }
            gridApi?.refreshCells({ force: true, columns: ["cwlAttacks", "cwlStars"] });
            toast.success("CWL stats fetched");
        } catch (error) {
            toast.error("Failed to fetch CWL stats", { description: error instanceof Error ? error.message : undefined });
        } finally {
            fetchingCwl = false;
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
        { header: "Notes", field: "notes" },
    ];

    function downloadCsv() {
        downloading = true;
        try {
            const lines = [
                [...CSV_COLUMNS.map((c) => csvCell(c.header)), ...seasons.map((s) => csvCell(s.name))].join(","),
                ...rows.map((r) =>
                    [
                        ...CSV_COLUMNS.map((c) => {
                            if (c.field === "cocAccountClan") return csvCell(clanNameByTag[normalizeTag(r.cocAccountClan)] ?? r.cocAccountClan ?? "");
                            if (c.field === "assignedTo")
                                return csvCell(r.assignedTo ? (cwlClanNameByTag[normalizeTag(r.assignedTo)] ?? r.assignedTo) : "");
                            return csvCell(r[c.field]);
                        }),
                        ...seasons.map((s) => (r.bonusSeasonIds.includes(s.id) ? "TRUE" : "FALSE")),
                    ].join(","),
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

    // Awards or removes a season's bonus for a user. Bonus is per Discord user, so
    // the change is mirrored onto every row that user owns.
    async function toggleBonus(data: Row, seasonId: number, selected: boolean) {
        const discordUserId = data.discordUserId;
        const apply = (sel: boolean) => {
            for (const r of rows) {
                if (r.discordUserId !== discordUserId) continue;
                const has = r.bonusSeasonIds.includes(seasonId);
                if (sel && !has) r.bonusSeasonIds = [...r.bonusSeasonIds, seasonId];
                else if (!sel && has) r.bonusSeasonIds = r.bonusSeasonIds.filter((x) => x !== seasonId);
            }
            gridApi?.refreshCells({ force: true, columns: ["thisSeasonBonus", "pastBonuses"] });
        };
        apply(selected);
        try {
            const resp = await setUserSeasonBonus(
                { discordUserId, seasonId, cocAccountTag: data.cocAccountTag, selected },
                { baseURL: PUBLIC_SERVER_URL, credentials: "include", headers: { "Content-Type": "application/json" } },
            );
            if (!resp.success) throw new Error();
            toast.success(`Bonus ${selected ? "awarded to" : "removed from"} ${data.discordUsername}`);
        } catch (error) {
            apply(!selected);
            toast.error("Failed to update bonus", { description: error instanceof Error ? error.message : undefined });
        }
    }

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
                {:else}
                    {#if currentSeasonName}<span class="font-medium text-stone-300">{currentSeasonName}</span> ·
                    {/if}
                    {#if presets.priority1 || presets.fullAttacks || searchText.trim()}{displayedCount} of {total}{:else}{total}{/if} entr{total === 1
                        ? "y"
                        : "ies"}
                {/if}
            </p>
        </div>
        <div class="flex w-full items-center gap-2 lg:w-auto">
            {#if seasonOptions.length > 0}
                <Select
                    options={seasonOptions}
                    bind:value={selectedSeasonValue}
                    onValueChange={(v) => load(Number(v))}
                    placeholder="Season"
                    disabled={loading}
                    class="w-40 shrink-0"
                />
            {/if}
            <Input placeholder="Search anything..." bind:value={searchText} oninput={applySearch} class="min-w-0 flex-1 lg:w-80 lg:flex-none" />
            <Button variant="success" class="shrink-0" onclick={applySearch} tooltip="Search" tooltipPlacement="bottom">
                <TablerSearch class="size-5" />
            </Button>
            <Button
                variant="base"
                class="shrink-0"
                disabled={fetchingCwl || loading || rows.length === 0}
                onclick={fetchCwlStats}
                tooltip="Fetch live CWL attacks & stars"
                tooltipPlacement="bottom"
            >
                {#if fetchingCwl}
                    <SvgSpinnersRingResize class="size-5" />
                {:else}
                    <TablerSwords class="size-5" />
                {/if}
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
        {#if presets.priority1 || presets.fullAttacks}
            <Badge
                icon={TablerX}
                content="Clear"
                variant="ghost"
                iconSize="size-4"
                onclick={() => (presets = { priority1: false, fullAttacks: false })}
                class="px-2 py-1 font-medium"
            />
        {/if}
    </div>

    {#if !loading && seasons.length === 0}
        <div class="px-4 text-xs text-stone-400">
            No CWL seasons yet — create one in <span class="font-medium text-stone-300">Settings</span> to start awarding bonuses.
        </div>
    {/if}

    <div class="flex-1">
        <Grid
            rowData={rows}
            gridOptions={{
                context: gridContext,
                rowHeight: 56,
                getRowId: (p) => String(p.data.id),
                // Alternating band + top-border divider per assigned-clan group (see recomputeBands).
                getRowClass: (p) => {
                    const id = p.node.id;
                    if (!id) return undefined;
                    const classes: string[] = [];
                    if (bandByRowId.get(id) === 1) classes.push("bonus-band");
                    if (dividerRowIds.has(id)) classes.push("clan-divider");
                    return classes.length ? classes : undefined;
                },
                // Preset filters run as a grid external filter, composing with the search box.
                isExternalFilterPresent: () => presets.priority1 || presets.fullAttacks,
                doesExternalFilterPass: (node) => !node.data || rowPassesPresets(node.data),
                // Always cluster rows by assigned CWL clan (groups A→Z, unassigned last);
                // the active sort orders rows within each clan.
                postSortRows: (params) => {
                    const nodes = params.nodes;
                    const groups = new Map<string, typeof nodes>();
                    for (const n of nodes) {
                        const key = n.data?.assignedTo ?? "";
                        const g = groups.get(key);
                        if (g) g.push(n);
                        else groups.set(key, [n]);
                    }
                    const keys = [...groups.keys()].sort((a, b) => (a === "" ? 1 : b === "" ? -1 : clanLabel(a).localeCompare(clanLabel(b))));
                    nodes.length = 0;
                    for (const k of keys) nodes.push(...groups.get(k)!);
                },
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

                    if (field === "notes") {
                        const notes = event.newValue ? String(event.newValue) : null;
                        try {
                            const resp = await updateCwlApplicationNotes(
                                event.data.id,
                                { notes },
                                { baseURL: PUBLIC_SERVER_URL, credentials: "include", headers: { "Content-Type": "application/json" } },
                            );
                            if (!resp.success) throw new Error();
                            event.data.notes = resp.data.application.notes;
                            toast.success("Notes updated");
                        } catch (error) {
                            event.data.notes = event.oldValue;
                            toast.error("Failed to update notes", { description: error instanceof Error ? error.message : undefined });
                        }
                        event.api.refreshCells({ rowNodes: [event.node], columns: ["notes"], force: true });
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
                    sort: "desc",
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
                {
                    headerName: "CWL Attacks",
                    colId: "cwlAttacks",
                    field: "cwlAttacks",
                    sortable: true,
                    filter: false,
                    width: 130,
                    valueFormatter: (p) => (p.value == null ? "" : `${p.value}/7`),
                },
                {
                    headerName: "CWL Stars",
                    colId: "cwlStars",
                    field: "cwlStars",
                    sortable: true,
                    filter: false,
                    width: 120,
                    cellRenderer: svelteRenderer(CwlStarsCell),
                },
                {
                    headerName: "This Season",
                    colId: "thisSeasonBonus",
                    sortable: false,
                    filter: false,
                    width: 150,
                    cellRenderer: svelteRenderer(BonusSeasonsCell),
                    cellRendererParams: () => ({ seasons: currentSeasonList, toggle: toggleBonus }),
                },
                {
                    headerName: "Past Bonuses",
                    colId: "pastBonuses",
                    sortable: false,
                    filter: false,
                    flex: 3,
                    minWidth: 260,
                    cellRenderer: svelteRenderer(BonusSeasonsCell),
                    cellRendererParams: () => ({ seasons: pastSeasons, toggle: toggleBonus }),
                },
                {
                    headerName: "Notes",
                    colId: "notes",
                    field: "notes",
                    sortable: false,
                    filter: false,
                    flex: 2,
                    minWidth: 200,
                    editable: true,
                    cellEditor: "uiInputEditor",
                    cellEditorParams: { type: "text" },
                    valueFormatter: (p) => p.value ?? "",
                },
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

    /* Divider between clan groups: top border on the first row of each group. */
    :global(.ag-theme-quartz .ag-row.clan-divider) {
        border-top: 2px solid var(--color-stone-600);
    }
</style>
