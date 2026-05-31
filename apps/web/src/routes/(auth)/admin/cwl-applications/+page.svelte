<script lang="ts">
    import { PUBLIC_SERVER_URL } from "$env/static/public";
    import CwlAccountCell from "$lib/components/grid/CwlAccountCell.svelte";
    import CwlDiscordCell from "$lib/components/grid/CwlDiscordCell.svelte";
    import Grid from "$lib/components/ui/Grid.svelte";
    import { svelteRenderer } from "$lib/components/ui/grid/SvelteCellRenderer";
    import type { Option } from "$lib/components/ui/Select.svelte";
    import Select from "$lib/components/ui/Select.svelte";
    import Seo from "$lib/components/ui/Seo.svelte";
    import { formatDate, formatDateTime } from "$lib/utils";
    import { fadeIn } from "$lib/utils/animations";
    import { assignCwlApplication, getCwlApplications, getJPACwlClans, type GetCwlApplications200 } from "@repo/clashofclans-client";
    import { toast } from "svelte-sonner";
    import SvgSpinnersBlocksScale from "~icons/svg-spinners/blocks-scale";
    import TablerX from "~icons/tabler/x";

    type Application = GetCwlApplications200["data"]["applications"][number];

    const now = new Date();
    const currentMonth = now.toLocaleString("en-US", { month: "long" });
    const currentYear = now.getFullYear();

    let applications = $state<Application[]>([]);
    let clanOptions = $state<Option[]>([{ label: "Unassigned", value: "" }]);
    let total = $state(0);
    let loading = $state(true);
    let filterMode = $state<string>("all");

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
                    month: currentMonth,
                    year: currentYear,
                    unassigned: filterMode === "unassigned" ? true : undefined,
                    limit: 200,
                    offset: 0,
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

<div in:fadeIn class="flex size-full flex-col gap-4 overflow-hidden">
    <div class="flex flex-wrap items-center justify-between gap-4">
        <div>
            <h1 class="text-2xl font-bold">CWL Applications</h1>
            <p class="text-sm text-stone-400">
                {currentMonth}
                {currentYear} &mdash; {total} application{total === 1 ? "" : "s"}
            </p>
        </div>
        <div class="w-full max-w-xs">
            <Select bind:value={filterMode} options={filterOptions} placeholder="Filter" />
        </div>
    </div>

    <div class="relative flex-1 overflow-hidden">
        <Grid
            rowData={applications}
            gridOptions={{
                rowHeight: 56,
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
                    sortable: false,
                    filter: false,
                    flex: 2,
                    cellRenderer: svelteRenderer(CwlAccountCell),
                },
                {
                    headerName: "Clan",
                    field: "cocAccountClan",
                    sortable: false,
                    filter: false,
                    flex: 1,
                    valueFormatter: (p) => p.value || "—",
                },
                { headerName: "Pref.", field: "preferenceNum", sortable: false, filter: false, width: 90 },
                {
                    headerName: "Weight",
                    field: "cocAccountWeight",
                    sortable: false,
                    filter: false,
                    flex: 1,
                    valueFormatter: (p) => (p.value != null ? Number(p.value).toLocaleString() : ""),
                },
                {
                    headerName: "Discord",
                    field: "discordUsername",
                    sortable: false,
                    filter: false,
                    flex: 2,
                    cellRenderer: svelteRenderer(CwlDiscordCell),
                },
                {
                    headerName: "Applied",
                    field: "appliedAt",
                    sortable: false,
                    filter: false,
                    flex: 1,
                    valueFormatter: (p) => (p.value ? formatDate(p.value) : ""),
                    tooltipValueGetter: (p) => (p.value ? formatDateTime(p.value) : ""),
                },
                {
                    headerName: "Assigned clan",
                    field: "assignedTo",
                    sortable: false,
                    filter: false,
                    flex: 2,
                    editable: true,
                    cellEditorPopup: true,
                    cellEditor: "uiSelectEditor",
                    cellEditorParams: () => ({ options: clanOptions }),
                    valueGetter: (p) => p.data?.assignedTo ?? "",
                    valueFormatter: (p) => clanLabel(p.value),
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
        {/if}
    </div>
</div>
