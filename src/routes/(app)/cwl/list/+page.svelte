<script lang="ts">
    import Grid from "$lib/components/admin/Grid.svelte";
    import UserCWLTableWrapper from "$lib/components/admin/wrappers/UserCWLTableWrapper.svelte";
    import { Button } from "$lib/components/ui/button";
    import type { InsertCWL } from "$lib/server/schema";
    import type { GridOptions, IDateFilterParams, ValueFormatterParams } from "@ag-grid-community/core";
    import { makeSvelteCellRenderer } from "ag-grid-svelte5-extended";
    import { json2csv } from "json-2-csv";
    import MaterialSymbolsChevronLeftRounded from "~icons/material-symbols/chevron-left-rounded";
    import MaterialSymbolsDownloadRounded from "~icons/material-symbols/download-rounded";

    let { data } = $props<{ data: any }>();
    let rowData = $derived<InsertCWL[]>(data.cwlApplications);

    const filterParams: IDateFilterParams = {
        comparator: (filterDate: Date, cellValue: string) => {
            const cellDate = new Date(cellValue).getDate();
            if (cellDate < filterDate.getDate()) {
                return -1;
            } else if (cellDate > filterDate.getDate()) {
                return 1;
            }
            return 0;
        }
    };

    const gridOptions: GridOptions<InsertCWL> = {
        columnDefs: [
            {
                field: "userName",
                cellRenderer: makeSvelteCellRenderer(UserCWLTableWrapper),
                filter: true,
                filterParams: {
                    filterPlaceholder: "Search by Discord Username"
                }
            },
            {
                field: "preferenceNum",
                headerName: "P.N",
                headerTooltip: "Preference Number",
                filter: "agNumberColumnFilter"
            },
            { field: "accountName", filter: true },
            { field: "accountTag", filter: true },
            {
                field: "accountClan",
                filter: true
            },
            {
                field: "assignedTo",
                headerName: "Assigned To",
                filter: true,
                valueFormatter: (params: ValueFormatterParams<InsertCWL, string>) => {
                    return data.cwlClans.find((clan: any) => clan.tag === params.data?.assignedTo)?.clanName || "";
                }
            },
            { field: "accountWeight", filter: "agNumberColumnFilter" },
            {
                field: "appliedAt",
                valueFormatter: (params: ValueFormatterParams<InsertCWL, Date>) => {
                    return new Date(params.data?.appliedAt || "").toLocaleString("en-IN", {
                        year: "numeric",
                        month: "2-digit",
                        day: "2-digit"
                    });
                },
                headerName: "Applied At",
                filter: "agDateColumnFilter",
                filterParams
            }
        ],
        autoSizeStrategy: {
            type: "fitCellContents",
            skipHeader: false
        },
        pagination: true,
        paginationAutoPageSize: true,
        rowSelection: {
            mode: "singleRow",
            checkboxes: false,
            enableClickSelection: false
        },
        getRowStyle: (params) => {
            if (params.data?.userId === data.userId) {
                return { background: "#3B82F619" };
            }
            return undefined;
        },
        onSortChanged(event) {
            const sortedData: InsertCWL[] = [];
            event.api.forEachNodeAfterFilterAndSort((node) => {
                if (node.data) {
                    sortedData.push(node.data);
                }
            });
            rowData = sortedData;
        }
    };
</script>

<svelte:head>
    <title>JPA | CWL List</title>
</svelte:head>

<main class="flex size-full flex-col items-center justify-center p-5">
    <div class="flex size-full max-w-7xl flex-col gap-5">
        <div class="flex w-full items-center justify-between">
            <div class="flex w-full items-center justify-between pt-20">
                <div class="flex items-center justify-center gap-2">
                    <Button size="icon" variant="outline" href={data.hasUserApplications ? "/cwl" : "/"}>
                        <MaterialSymbolsChevronLeftRounded class="size-6" />
                    </Button>
                    <h1 class="text-2xl font-bold">CWL Applications</h1>
                </div>
                <Button
                    size="icon"
                    disabled={rowData.length <= 0}
                    onclick={() => {
                        const csvRow = rowData.map((row) => ({
                            "User Name": row.userName,
                            "Preference Number": row.preferenceNum,
                            "Account Name": row.accountName,
                            "Account Tag": row.accountTag,
                            "Account Clan": row.accountClan,
                            "Assigned To": data.cwlClans.find((clan: any) => clan.tag === row.assignedTo)?.clanName || "",
                            "Account Weight": row.accountWeight,
                            "Applied At": new Date(row.appliedAt || "").toLocaleString("en-IN", {
                                year: "numeric",
                                month: "2-digit",
                                day: "2-digit",
                                hour: "2-digit",
                                minute: "2-digit"
                            })
                        }));
                        const csv = json2csv(csvRow);
                        const blob = new Blob([csv], { type: "text/csv" });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.href = url;
                        a.download = "cwl.csv";
                        a.click();
                        URL.revokeObjectURL(url);
                    }}
                >
                    <MaterialSymbolsDownloadRounded />
                </Button>
            </div>
        </div>
        <div class="size-full">
            <Grid {gridOptions} bind:rowData />
        </div>
    </div>
</main>
