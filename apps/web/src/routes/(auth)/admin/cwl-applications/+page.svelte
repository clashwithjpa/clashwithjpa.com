<script lang="ts">
    import { PUBLIC_SERVER_URL } from "$env/static/public";
    import CwlAccountCell from "$lib/components/grid/CwlAccountCell.svelte";
    import CwlDiscordCell from "$lib/components/grid/CwlDiscordCell.svelte";
    import CwlStatusCell from "$lib/components/grid/CwlStatusCell.svelte";
    import Toolbar from "$lib/components/Toolbar.svelte";
    import Button from "$lib/components/ui/Button.svelte";
    import Grid from "$lib/components/ui/Grid.svelte";
    import { svelteRenderer } from "$lib/components/ui/grid/SvelteCellRenderer";
    import Input from "$lib/components/ui/Input.svelte";
    import type { Option } from "$lib/components/ui/Select.svelte";
    import Select from "$lib/components/ui/Select.svelte";
    import Seo from "$lib/components/ui/Seo.svelte";
    import { formatDate, formatDateTime } from "$lib/utils";
    import { fadeIn } from "$lib/utils/animations";
    import {
        assignCwlApplication,
        assignCwlApplicationsBulk,
        getCOCClanMembers,
        getCwlApplications,
        getJPACwlClans,
        type GetCwlApplications200,
    } from "@repo/clashofclans-client";
    import type { GridApi, ICellRendererParams } from "ag-grid-community";
    import { untrack } from "svelte";
    import { toast } from "svelte-sonner";
    import SvgSpinnersBlocksScale from "~icons/svg-spinners/blocks-scale";
    import SvgSpinnersRingResize from "~icons/svg-spinners/ring-resize";
    import TablerAlertTriangle from "~icons/tabler/alert-triangle";
    import TablerArrowsExchange from "~icons/tabler/arrows-exchange";
    import TablerRefresh from "~icons/tabler/refresh";
    import TablerSearch from "~icons/tabler/search";
    import TablerShield from "~icons/tabler/shield";
    import TablerX from "~icons/tabler/x";

    type Application = GetCwlApplications200["data"]["applications"][number];

    let applications = $state<Application[]>([]);
    let clanOptions = $state<Option[]>([{ label: "Unassigned", value: "" }]);
    // Clan tag (normalized) -> display name.
    let clanNameByTag = $state<Record<string, string>>({});
    let total = $state(0);
    let loading = $state(true);
    let filterMode = $state<string>("all");
    let clanFilter = $state<string>("all");

    // Clan tag (normalized) -> in-game roster. Missing key = not fetched yet; `ok: false` =
    // fetch failed, kept distinct from "fetched, applicant simply absent".
    type RosterEntry = { ok: true; tags: Set<string> } | { ok: false };
    let clanRosters = $state<Record<string, RosterEntry>>({});
    let rostersLoading = $state(false);

    function normalizeTag(tag: string | null | undefined): string {
        return (tag ?? "").trim().toUpperCase();
    }

    let gridApi = $state<GridApi | null>(null);
    let selectedIds = $state<number[]>([]);
    let bulkClan = $state<string>("");
    let bulkProcessing = $state(false);
    let searchText = $state("");

    function applySearch() {
        gridApi?.setGridOption("quickFilterText", searchText);
    }
    // Exclude the "Unassigned" entry so bulk assign can't accidentally mass-unassign.
    let bulkClanOptions = $derived(clanOptions.filter((o) => o.value !== ""));
    // Per-clan filter: only clans that actually have someone assigned to them.
    let clanFilterOptions = $derived<Option[]>([
        { label: "All clans", value: "all" },
        ...bulkClanOptions.filter((o) => assignedClanTags.includes(normalizeTag(o.value))),
    ]);
    let displayedApplications = $derived(clanFilter === "all" ? applications : applications.filter((a) => a.assignedTo === clanFilter));

    const filterOptions: Option[] = [
        { label: "All", value: "all" },
        { label: "Unassigned", value: "unassigned" },
        { label: "Assigned", value: "assigned" },
    ];

    async function loadClans() {
        try {
            const resp = await getJPACwlClans({ baseURL: PUBLIC_SERVER_URL, credentials: "include" });
            if (resp.success) {
                const clans = Object.values(resp.data.clans);
                clanOptions = [
                    { label: "Unassigned", value: "" },
                    ...clans.map((c) => ({ label: `${c.clanName} (${c.clanTag})`, value: c.clanTag })),
                ];
                clanNameByTag = Object.fromEntries(clans.map((c) => [normalizeTag(c.clanTag), c.clanName]));
            }
        } catch {
            // ignore - selectors will still work without options
        }
    }

    async function load() {
        loading = true;
        try {
            const resp = await getCwlApplications(
                {
                    unassigned: filterMode === "unassigned" ? true : undefined,
                },
                { baseURL: PUBLIC_SERVER_URL, credentials: "include" },
            );
            if (resp.success) {
                let list = resp.data.applications;
                if (filterMode === "assigned") list = list.filter((a) => a.assignedTo);
                applications = list;
                total = resp.data.total;
            } else {
                toast.error("Failed to load CWL applications");
            }
        } catch (e: any) {
            toast.error("Failed to load CWL applications", { description: e?.message });
        } finally {
            loading = false;
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
                toast.success(clanTag ? "Application assigned" : "Application unassigned");
                return resp.data.application.assignedTo ?? "";
            }
            toast.error("Failed to assign application");
        } catch (e: any) {
            toast.error("Failed to assign application", { description: e?.message });
        }
        return null;
    }

    async function bulkAssign() {
        if (selectedIds.length === 0 || !bulkClan) return;
        bulkProcessing = true;
        const ids = selectedIds;
        try {
            const resp = await assignCwlApplicationsBulk(
                { ids, clanTag: bulkClan },
                { baseURL: PUBLIC_SERVER_URL, credentials: "include", headers: { "Content-Type": "application/json" } },
            );
            if (resp.success) {
                const idSet = new Set(ids);
                applications = applications.map((a) => (idSet.has(a.id) ? { ...a, assignedTo: bulkClan } : a));
                toast.success(`${resp.data.count} application${resp.data.count === 1 ? "" : "s"} assigned to ${clanLabel(bulkClan)}`);
                clearSelection();
                bulkClan = "";
            } else {
                toast.error("Failed to assign applications");
            }
        } catch (e: any) {
            toast.error("Failed to assign applications", { description: e?.message });
        } finally {
            bulkProcessing = false;
        }
    }

    function clearSelection() {
        gridApi?.deselectAll();
        selectedIds = [];
    }

    function clanLabel(clanTag: string | null | undefined): string {
        if (!clanTag) return "Unassigned";
        return clanOptions.find((o) => o.value === clanTag)?.label ?? clanTag;
    }

    // Clans with at least one assigned applicant — the only rosters we fetch.
    let assignedClanTags = $derived([...new Set(applications.filter((a) => a.assignedTo).map((a) => normalizeTag(a.assignedTo)))]);

    // Fetch the in-game roster for each clan we haven't fetched yet.
    async function loadClanRosters(tags: string[]) {
        const missing = tags.filter((t) => t && !(t in clanRosters));
        if (missing.length === 0) return;
        rostersLoading = true;
        try {
            const results = await Promise.all(
                missing.map(async (tag): Promise<readonly [string, RosterEntry]> => {
                    try {
                        const resp = await getCOCClanMembers(encodeURIComponent(tag), { baseURL: PUBLIC_SERVER_URL, credentials: "include" });
                        if (resp.success) {
                            return [tag, { ok: true, tags: new Set(resp.data.clanMembers.items.map((m) => normalizeTag(m.tag))) }];
                        }
                    } catch {
                        // fetch failed — recorded below
                    }
                    return [tag, { ok: false }];
                }),
            );
            clanRosters = { ...clanRosters, ...Object.fromEntries(results) };
        } finally {
            rostersLoading = false;
        }
    }

    function retryRoster(clanTag: string) {
        const tag = normalizeTag(clanTag);
        const { [tag]: _removed, ...rest } = clanRosters;
        clanRosters = rest;
        loadClanRosters([tag]);
    }

    // Has the applicant joined the clan they were assigned to, in-game?
    //   joined / wrong-clan (in a different fetched clan) / missing / error / unknown / ""
    type JoinStatus = "joined" | "wrong-clan" | "missing" | "error" | "unknown" | "";
    function joinedInfo(app: Application | undefined): { status: JoinStatus; wrongClan: string } {
        if (!app?.assignedTo) return { status: "", wrongClan: "" };
        const assignedTag = normalizeTag(app.assignedTo);
        const accountTag = normalizeTag(app.cocAccountTag);
        const assigned = clanRosters[assignedTag];
        if (assigned?.ok && assigned.tags.has(accountTag)) return { status: "joined", wrongClan: "" };
        // An account is only ever in one clan, so a match in a different clan is definitive.
        for (const [tag, entry] of Object.entries(clanRosters)) {
            if (tag === assignedTag || !entry.ok) continue;
            if (entry.tags.has(accountTag)) return { status: "wrong-clan", wrongClan: clanNameByTag[tag] ?? tag };
        }
        if (!assigned) return { status: "unknown", wrongClan: "" };
        if (!assigned.ok) return { status: "error", wrongClan: "" };
        return { status: "missing", wrongClan: "" };
    }

    type ClanState = "loading" | "ok" | "error";
    type ClanStat = { clanTag: string; name: string; total: number; joined: number; state: ClanState };
    let clanStats = $derived.by(() => {
        const map = new Map<string, ClanStat>();
        for (const a of applications) {
            if (!a.assignedTo) continue;
            const tag = normalizeTag(a.assignedTo);
            const entry = clanRosters[tag];
            let stat = map.get(tag);
            if (!stat) {
                const state: ClanState = !entry ? "loading" : entry.ok ? "ok" : "error";
                stat = { clanTag: a.assignedTo, name: clanNameByTag[tag] ?? a.assignedTo, total: 0, joined: 0, state };
                map.set(tag, stat);
            }
            stat.total++;
            if (entry?.ok && entry.tags.has(normalizeTag(a.cocAccountTag))) stat.joined++;
        }
        return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
    });
    let totalAssigned = $derived(clanStats.reduce((n, s) => n + s.total, 0));
    let totalJoined = $derived(clanStats.reduce((n, s) => n + s.joined, 0));
    let erroredClans = $derived(clanStats.filter((s) => s.state === "error").length);
    let wrongClanCount = $derived(applications.filter((a) => joinedInfo(a).status === "wrong-clan").length);

    loadClans();
    $effect(() => {
        filterMode; // track
        load();
    });
    // Fetch rosters when the set of assigned clans changes; untrack so reading the cache
    // inside doesn't re-trigger this effect.
    $effect(() => {
        const tags = assignedClanTags; // track
        untrack(() => loadClanRosters(tags));
    });
    // Repaint the Status column once rosters arrive.
    $effect(() => {
        clanRosters; // track
        gridApi?.refreshCells({ force: true, columns: ["joinedStatus"] });
    });
</script>

<Seo title="CWL Applications" description="Manage CWL applications and assign players to clans" />

<div in:fadeIn class="relative flex size-full flex-col gap-4 overflow-hidden">
    <div class="flex flex-col px-4 pt-4">
        <h1 class="text-2xl font-bold">CWL Applications</h1>
        <p class="text-sm text-stone-400">
            {#if displayedApplications.length !== total}
                {displayedApplications.length} of {total} application{total === 1 ? "" : "s"}
            {:else}
                {total} application{total === 1 ? "" : "s"}
            {/if}
        </p>

        {#if clanStats.length > 0}
            <div class="mt-3 flex flex-wrap items-center gap-2">
                <span class="flex items-center gap-1.5 text-sm font-medium text-stone-200">
                    {totalJoined} / {totalAssigned} joined their CWL clan
                    {#if rostersLoading}
                        <SvgSpinnersRingResize class="size-3.5 text-stone-400" />
                    {/if}
                </span>
                {#if erroredClans > 0}
                    <span class="flex items-center gap-1 text-xs text-red-400">
                        <TablerAlertTriangle class="size-3.5" />
                        couldn't check {erroredClans} clan{erroredClans === 1 ? "" : "s"}
                    </span>
                {/if}
                {#if wrongClanCount > 0}
                    <span class="flex items-center gap-1 text-xs text-blue-400">
                        <TablerArrowsExchange class="size-3.5" />
                        {wrongClanCount} in a different CWL clan
                    </span>
                {/if}
                <div class="hidden h-4 w-px bg-stone-700 sm:block"></div>
                {#each clanStats as stat (stat.clanTag)}
                    <div class="flex items-center gap-1.5 rounded border-2 border-stone-700/50 bg-stone-900 px-2 py-1 text-xs">
                        <TablerShield class="size-3.5 shrink-0 text-stone-400" />
                        <span class="font-medium text-stone-100">{stat.name}</span>
                        {#if stat.state === "ok"}
                            <span class={stat.joined === stat.total ? "font-medium text-green-400" : "font-medium text-yellow-400"}>
                                {stat.joined}/{stat.total}
                            </span>
                        {:else if stat.state === "loading"}
                            <span class="text-stone-400">…/{stat.total}</span>
                        {:else}
                            <span class="font-medium text-red-400">check failed</span>
                            <button
                                type="button"
                                class="cursor-pointer text-stone-400 transition-colors hover:text-stone-100"
                                title="Retry fetching this clan's roster"
                                onclick={() => retryRoster(stat.clanTag)}
                            >
                                <TablerRefresh class="size-3.5" />
                            </button>
                        {/if}
                    </div>
                {/each}
            </div>
        {/if}
    </div>

    <div class="flex-1">
        <Grid
            rowData={displayedApplications}
            gridOptions={{
                rowHeight: 56,
                getRowId: (p) => String(p.data.id),
                rowSelection: { mode: "multiRow", checkboxes: true, headerCheckbox: true, enableClickSelection: false },
                onGridReady: (params) => {
                    gridApi = params.api;
                },
                onSelectionChanged: (event) => {
                    selectedIds = event.api.getSelectedRows().map((r) => r.id);
                },
                onCellValueChanged: async (event) => {
                    if (event.colDef.field !== "assignedTo" || event.oldValue === event.newValue) return;
                    const result = await assign(event.data.id, event.newValue || "");
                    event.data.assignedTo = result ?? event.oldValue;
                    event.api.refreshCells({ rowNodes: [event.node], columns: ["assignedTo", "joinedStatus"], force: true });
                },
            }}
            columnDefs={[
                {
                    headerName: "Discord",
                    field: "discordUsername",
                    sortable: true,
                    filter: false,
                    flex: 2,
                    cellRenderer: svelteRenderer(CwlDiscordCell),
                    getQuickFilterText: (p) => `${p.data.discordUsername} ${p.data.discordUserId}`,
                },
                {
                    headerName: "Account",
                    field: "cocAccountName",
                    sortable: true,
                    filter: false,
                    flex: 2,
                    cellRenderer: svelteRenderer(CwlAccountCell),
                    getQuickFilterText: (p) => `${p.data.cocAccountName} ${p.data.cocAccountTag}`,
                },
                {
                    headerName: "Clan",
                    field: "cocAccountClan",
                    sortable: true,
                    filter: false,
                    flex: 1,
                    valueFormatter: (p) => p.value || "—",
                },
                { headerName: "Pref.", field: "preferenceNum", sortable: true, filter: false, width: 90 },
                {
                    headerName: "Weight",
                    field: "cocAccountWeight",
                    sortable: true,
                    filter: false,
                    flex: 1,
                    valueFormatter: (p) => (p.value != null ? Number(p.value).toLocaleString() : ""),
                },
                {
                    headerName: "Applied",
                    field: "appliedAt",
                    sortable: true,
                    sort: "desc",
                    filter: false,
                    flex: 1,
                    valueFormatter: (p) => (p.value ? formatDate(p.value) : ""),
                    tooltipValueGetter: (p) => (p.value ? formatDateTime(p.value) : ""),
                },
                {
                    headerName: "Assigned clan",
                    field: "assignedTo",
                    sortable: true,
                    filter: false,
                    flex: 2,
                    editable: true,
                    cellEditorPopup: true,
                    cellEditor: "uiSelectEditor",
                    cellEditorParams: () => ({ options: clanOptions }),
                    valueGetter: (p) => p.data?.assignedTo ?? "",
                    valueFormatter: (p) => clanLabel(p.value),
                    getQuickFilterText: (p) => clanLabel(p.value),
                },
                {
                    headerName: "Status",
                    colId: "joinedStatus",
                    sortable: true,
                    filter: false,
                    width: 180,
                    cellRenderer: svelteRenderer(CwlStatusCell),
                    cellRendererParams: (p: ICellRendererParams) => ({ wrongClan: joinedInfo(p.data).wrongClan }),
                    valueGetter: (p) => joinedInfo(p.data).status,
                    getQuickFilterText: (p) => {
                        const info = joinedInfo(p.data);
                        return `${info.status} ${info.wrongClan}`.trim();
                    },
                },
            ]}
        />

        {#if loading}
            <div class="absolute inset-0 flex items-center justify-center bg-stone-950 text-stone-400">
                <SvgSpinnersBlocksScale class="size-12" />
            </div>
        {:else if applications.length === 0}
            <div class="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-stone-950 text-stone-400">
                <TablerX class="size-12" />
                <span>No CWL applications found</span>
            </div>
        {:else}
            <Toolbar>
                <div class="flex size-full flex-col items-stretch justify-between gap-4 lg:flex-row lg:items-center">
                    <div class="flex w-full flex-col gap-2 lg:w-auto lg:flex-1 lg:flex-row lg:items-center">
                        <div class="flex gap-2">
                            <div class="w-full lg:w-36">
                                <Select
                                    bind:value={filterMode}
                                    options={filterOptions}
                                    placeholder="Status"
                                    onValueChange={(v) => {
                                        if (v === "unassigned") clanFilter = "all";
                                    }}
                                />
                            </div>
                            <div class="w-full lg:w-56">
                                <Select
                                    bind:value={clanFilter}
                                    options={clanFilterOptions}
                                    placeholder="Filter by clan"
                                    disabled={filterMode === "unassigned"}
                                />
                            </div>
                        </div>
                        <div class="flex flex-1 items-center gap-2">
                            <Input placeholder="Search anything" bind:value={searchText} oninput={applySearch} class="flex-1 lg:max-w-80" />
                            <Button variant="success" class="shrink-0" onclick={applySearch} tooltip="Search" tooltipPlacement="top">
                                <TablerSearch class="size-5" />
                            </Button>
                        </div>
                    </div>

                    {#if selectedIds.length > 0}
                        <div class="hidden h-8 w-px self-stretch bg-stone-700 lg:block lg:self-auto"></div>
                        <div class="flex w-full flex-col gap-2 lg:w-fit lg:flex-row lg:items-center lg:gap-2">
                            <span class="text-sm font-medium whitespace-nowrap text-stone-200">
                                {selectedIds.length} selected
                            </span>
                            <div class="flex w-full flex-col gap-2 lg:w-fit lg:flex-row lg:items-center">
                                <div class="lg:w-48">
                                    <Select bind:value={bulkClan} options={bulkClanOptions} placeholder="Assign to..." />
                                </div>
                                <div class="flex w-full gap-2 lg:w-fit">
                                    <Button variant="success" size="sm" class="w-full" disabled={bulkProcessing || !bulkClan} onclick={bulkAssign}>
                                        {bulkProcessing ? "…" : "Assign"}
                                    </Button>
                                    <Button variant="ghost" size="sm" class="w-full" disabled={bulkProcessing} onclick={clearSelection}>Clear</Button>
                                </div>
                            </div>
                        </div>
                    {/if}
                </div>
            </Toolbar>
        {/if}
    </div>
</div>
