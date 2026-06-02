<script lang="ts">
    import { PUBLIC_SERVER_URL } from "$env/static/public";
    import Toolbar from "$lib/components/Toolbar.svelte";
    import Button from "$lib/components/ui/Button.svelte";
    import Grid from "$lib/components/ui/Grid.svelte";
    import Input from "$lib/components/ui/Input.svelte";
    import Seo from "$lib/components/ui/Seo.svelte";
    import { fadeIn } from "$lib/utils/animations";
    import { getAdminCocAccounts, updateCocAccountExternal, updateCocAccountWarWeight } from "@repo/clashofclans-client";
    import type { GridApi, IDatasource, IGetRowsParams } from "ag-grid-community";
    import { toast } from "svelte-sonner";
    import TablerSearch from "~icons/tabler/search";

    let gridApi: GridApi | null = $state(null);
    let searchText = $state("");

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
        ]}
    />

    <Toolbar>
        <Input placeholder="Search anything..." bind:value={searchText} onchange={handleSearchChange} class="lg:w-80" />
        <Button variant="success" class="shrink-0" onclick={handleSearchChange} tooltip="Search" tooltipPlacement="top">
            <TablerSearch class="size-5" />
        </Button>
    </Toolbar>
</div>
