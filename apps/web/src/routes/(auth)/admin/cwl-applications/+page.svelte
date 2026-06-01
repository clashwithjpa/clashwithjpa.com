<script lang="ts">
    import { PUBLIC_SERVER_URL } from "$env/static/public";
    import CwlAccountCell from "$lib/components/grid/CwlAccountCell.svelte";
    import CwlDiscordCell from "$lib/components/grid/CwlDiscordCell.svelte";
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
        getCwlApplications,
        getJPACwlClans,
        type GetCwlApplications200,
    } from "@repo/clashofclans-client";
    import type { GridApi, IRowNode } from "ag-grid-community";
    import { toast } from "svelte-sonner";
    import SvgSpinnersBlocksScale from "~icons/svg-spinners/blocks-scale";
    import TablerSearch from "~icons/tabler/search";
    import TablerX from "~icons/tabler/x";

    type Application = GetCwlApplications200["data"]["applications"][number];

    let applications = $state<Application[]>([]);
    let clanOptions = $state<Option[]>([{ label: "Unassigned", value: "" }]);
    let total = $state(0);
    let loading = $state(true);
    let filterMode = $state<string>("all");

    let gridApi = $state<GridApi | null>(null);
    let selectedIds = $state<number[]>([]);
    let bulkClan = $state<string>("");
    let bulkProcessing = $state(false);
    let selectCount = $state(30);
    let searchText = $state("");

    // Client-side instant search across the loaded season (name, tag, discord, clan).
    function applySearch() {
        gridApi?.setGridOption("quickFilterText", searchText);
    }
    // Real clans only (exclude the "Unassigned" entry) so bulk assign can't accidentally mass-unassign.
    let bulkClanOptions = $derived(clanOptions.filter((o) => o.value !== ""));

    const filterOptions: Option[] = [
        { label: "All", value: "all" },
        { label: "Unassigned", value: "unassigned" },
        { label: "Assigned", value: "assigned" },
    ];

    async function loadClans() {
        try {
            const resp = await getJPACwlClans({ baseURL: PUBLIC_SERVER_URL, credentials: "include" });
            if (resp.success) {
                clanOptions = [
                    { label: "Unassigned", value: "" },
                    ...Object.values(resp.data.clans).map((c) => ({ label: `${c.clanName} (${c.clanTag})`, value: c.clanTag })),
                ];
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

    // Selects the first `count` unassigned rows in the current sort/filter order
    // (e.g. sort by weight first, then grab the top 30 to assign to a clan).
    function selectUnassigned(count: number) {
        if (!gridApi || count < 1) return;
        gridApi.deselectAll();
        const nodes: IRowNode[] = [];
        gridApi.forEachNodeAfterFilterAndSort((node) => {
            if (nodes.length >= count) return;
            if (node.data && !node.data.assignedTo) nodes.push(node);
        });
        if (nodes.length === 0) {
            toast.info("No unassigned applications to select");
            return;
        }
        gridApi.setNodesSelected({ nodes, newValue: true, source: "api" });
    }

    function clanLabel(clanTag: string | null | undefined): string {
        if (!clanTag) return "Unassigned";
        return clanOptions.find((o) => o.value === clanTag)?.label ?? clanTag;
    }

    loadClans();
    $effect(() => {
        filterMode; // track
        load();
    });
</script>

<Seo title="CWL Applications" description="Manage CWL applications and assign players to clans" />

<div in:fadeIn class="relative flex size-full flex-col gap-4 overflow-hidden">
    <div class="flex flex-col px-4 pt-4">
        <h1 class="text-2xl font-bold">CWL Applications</h1>
        <p class="text-sm text-stone-400">
            {total} application{total === 1 ? "" : "s"}
        </p>
    </div>

    <div class="flex-1 overflow-hidden">
        <Grid
            rowData={applications}
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
                    event.api.refreshCells({ rowNodes: [event.node], columns: ["assignedTo"], force: true });
                },
            }}
            columnDefs={[
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
                    headerName: "Discord",
                    field: "discordUsername",
                    sortable: true,
                    filter: false,
                    flex: 2,
                    cellRenderer: svelteRenderer(CwlDiscordCell),
                    getQuickFilterText: (p) => `${p.data.discordUsername} ${p.data.discordUserId}`,
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
                <div class="flex flex-col items-start justify-between gap-4 lg:flex-row">
                    <div class="flex flex-1 items-center gap-2">
                        <Input
                            placeholder="Search by name, tag, Discord or clan..."
                            bind:value={searchText}
                            oninput={applySearch}
                            class="flex-1 lg:max-w-80"
                        />
                        <Button variant="success" class="shrink-0" onclick={applySearch} tooltip="Search" tooltipPlacement="top">
                            <TablerSearch class="size-5" />
                        </Button>
                    </div>

                    {#if selectedIds.length > 0}
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
