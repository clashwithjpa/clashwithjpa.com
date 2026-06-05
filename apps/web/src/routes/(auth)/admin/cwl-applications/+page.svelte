<script lang="ts">
    import { PUBLIC_SERVER_URL } from "$env/static/public";
    import CwlAccountCell from "$lib/components/grid/CwlAccountCell.svelte";
    import CwlDiscordCell from "$lib/components/grid/CwlDiscordCell.svelte";
    import CwlStatusCell from "$lib/components/grid/CwlStatusCell.svelte";
    import Badge from "$lib/components/ui/Badge.svelte";
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
    import SvgSpinnersRingResize from "~icons/svg-spinners/ring-resize";
    import TablerAlertTriangle from "~icons/tabler/alert-triangle";
    import TablerArrowsExchange from "~icons/tabler/arrows-exchange";
    import TablerRefresh from "~icons/tabler/refresh";
    import TablerShield from "~icons/tabler/shield";

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
    let scrollEl = $state<HTMLDivElement | null>(null);

    // The edge fades are pure CSS (see the scroll-driven mask in the style block). This effect only
    // suppresses the click that fires at the end of a drag-scroll so badges don't toggle.
    $effect(() => {
        const el = scrollEl;
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

    let isDragging = $state(false);
    let hasDragged = false;
    let dragStartX = 0;
    let dragScrollLeft = 0;
    let dragCursorStyle: HTMLStyleElement | null = null;

    function onDragStart(e: MouseEvent) {
        if (!scrollEl) return;
        isDragging = true;
        hasDragged = false;
        dragStartX = e.pageX - scrollEl.offsetLeft;
        dragScrollLeft = scrollEl.scrollLeft;
        dragCursorStyle = document.createElement("style");
        dragCursorStyle.textContent = "* { cursor: grabbing !important; }";
        document.head.appendChild(dragCursorStyle);
        document.addEventListener("mousemove", onDragMove);
        document.addEventListener("mouseup", onDragEnd);
    }

    function onDragMove(e: MouseEvent) {
        if (!isDragging || !scrollEl) return;
        e.preventDefault();
        const dx = e.pageX - scrollEl.offsetLeft - dragStartX;
        if (Math.abs(dx) > 4) hasDragged = true;
        scrollEl.scrollLeft = dragScrollLeft - dx;
    }

    function onDragEnd() {
        isDragging = false;
        dragCursorStyle?.remove();
        dragCursorStyle = null;
        document.removeEventListener("mousemove", onDragMove);
        document.removeEventListener("mouseup", onDragEnd);
    }

    function applySearch() {
        gridApi?.setGridOption("quickFilterText", searchText);
    }
    // Exclude the "Unassigned" entry so bulk assign can't accidentally mass-unassign.
    let bulkClanOptions = $derived(clanOptions.filter((o) => o.value !== ""));
    let displayedApplications = $derived(
        clanFilter === "all"
            ? applications
            : clanFilter === "wrong-clan"
              ? applications.filter((a) => joinedInfo(a).status === "wrong-clan")
              : applications.filter((a) => a.assignedTo === clanFilter),
    );

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
    <div class="flex flex-col gap-4 px-4 pt-4">
        <div class="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
            <div>
                <h1 class="text-2xl font-bold">CWL Applications</h1>
                <p class="text-sm text-stone-400">
                    {#if displayedApplications.length !== total}
                        {displayedApplications.length} of {total} application{total === 1 ? "" : "s"}
                    {:else}
                        {total} application{total === 1 ? "" : "s"}
                    {/if}
                </p>
            </div>
            <div class="flex flex-col gap-2 lg:flex-row lg:items-center">
                <Input placeholder="Search anything..." bind:value={searchText} oninput={applySearch} class="w-full lg:w-80" />
                {#if selectedIds.length > 0}
                    <div class="hidden h-8 w-px bg-stone-700 lg:block"></div>
                    <div class="flex flex-col gap-2 lg:flex-row lg:items-center">
                        <span class="text-sm font-medium whitespace-nowrap text-stone-200">{selectedIds.length} selected</span>
                        <div class="flex w-full gap-2 lg:w-fit">
                            <div class="w-full lg:w-44">
                                <Select bind:value={bulkClan} options={bulkClanOptions} placeholder="Assign to..." />
                            </div>
                            <Button variant="success" size="sm" disabled={bulkProcessing || !bulkClan} onclick={bulkAssign}>
                                {bulkProcessing ? "…" : "Assign"}
                            </Button>
                            <Button variant="ghost" size="sm" disabled={bulkProcessing} onclick={clearSelection}>Clear</Button>
                        </div>
                    </div>
                {/if}
            </div>
        </div>

        {#if clanStats.length > 0}
            <!-- svelte-ignore a11y_no_static_element_interactions -->
            <div
                bind:this={scrollEl}
                onmousedown={onDragStart}
                class="edge-fade flex cursor-grab items-center gap-2 overflow-x-auto [&::-webkit-scrollbar]:hidden {isDragging ? 'select-none' : ''}"
                style="scrollbar-width: none;"
            >
                <span class="flex shrink-0 items-center gap-1.5 text-sm font-medium text-stone-200">
                    {totalJoined} / {totalAssigned} joined their CWL clan
                    {#if rostersLoading}
                        <SvgSpinnersRingResize class="size-3.5 text-stone-400" />
                    {/if}
                </span>
                {#if erroredClans > 0}
                    <Badge
                        icon={TablerAlertTriangle}
                        content="Couldn't check {erroredClans} clan{erroredClans === 1 ? '' : 's'}"
                        variant="red"
                        iconSize="size-4"
                        class="shrink-0 px-2 py-1"
                    />
                {/if}
                {#if wrongClanCount > 0}
                    {@const isWrongClanActive = clanFilter === "wrong-clan"}
                    <Badge
                        icon={TablerArrowsExchange}
                        content="{wrongClanCount} in different clan"
                        variant="blue"
                        iconSize="size-4"
                        onclick={() => (clanFilter = isWrongClanActive ? "all" : "wrong-clan")}
                        class="shrink-0 px-2 py-1 {isWrongClanActive ? '' : clanFilter !== 'all' ? 'opacity-50 hover:opacity-100' : ''}"
                    />
                {/if}
                <div class="h-4 w-px shrink-0 bg-stone-700"></div>
                {#each clanStats as stat (stat.clanTag)}
                    {@const isActive = clanFilter === stat.clanTag}
                    {@const isMaxed = stat.joined === stat.total}
                    {@const variant = stat.state === "ok" ? (isMaxed ? "green" : "yellow") : stat.state === "loading" ? "blue" : "red"}
                    {@const statusText =
                        stat.state === "ok" ? `${stat.joined}/${stat.total}` : stat.state === "loading" ? `…/${stat.total}` : "failed"}

                    <div class="flex shrink-0 items-center gap-2">
                        <Badge
                            icon={stat.state === "loading" ? SvgSpinnersRingResize : TablerShield}
                            content="{stat.name} • {statusText}"
                            {variant}
                            iconSize="size-4"
                            onclick={() => (clanFilter = isActive ? "all" : stat.clanTag)}
                            class="px-2 py-1 font-medium {isActive ? '' : clanFilter !== 'all' ? 'opacity-50 hover:opacity-100' : ''}"
                        />
                        {#if stat.state !== "ok" && stat.state !== "loading"}
                            <Badge icon={TablerRefresh} variant="red" onclick={() => retryRoster(stat.clanTag)} class="px-2 py-1" iconSize="size-4" />
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
    </div>
</div>

<style>
    /* Animatable so the scroll-driven keyframes below can tween the fade amount. */
    @property --fade-l {
        syntax: "<number>";
        inherits: false;
        initial-value: 0;
    }
    @property --fade-r {
        syntax: "<number>";
        inherits: false;
        initial-value: 0;
    }

    .edge-fade {
        --fade-size: 2rem;
        --fade-l: 0;
        --fade-r: 0;
        mask-image: linear-gradient(
            to right,
            transparent,
            #000 calc(var(--fade-size) * var(--fade-l)),
            #000 calc(100% - var(--fade-size) * var(--fade-r)),
            transparent
        );
        animation:
            edge-fade-left linear both,
            edge-fade-right linear both;
        animation-timeline: scroll(self inline), scroll(self inline);
        animation-range:
            0 var(--fade-size),
            calc(100% - var(--fade-size)) 100%;
    }

    @keyframes edge-fade-left {
        from {
            --fade-l: 0;
        }
        to {
            --fade-l: 1;
        }
    }
    @keyframes edge-fade-right {
        from {
            --fade-r: 1;
        }
        to {
            --fade-r: 0;
        }
    }
</style>
