<script lang="ts">
    import Grid from "$lib/components/admin/Grid.svelte";
    import ClanCWLTableWrapper from "$lib/components/admin/wrappers/ClanCWLTableWrapper.svelte";
    import UserCWLTableWrapper from "$lib/components/admin/wrappers/UserCWLTableWrapper.svelte";
    import UserDataCWLTableWrapper from "$lib/components/admin/wrappers/UserDataCWLTableWrapper.svelte";
    import type { InsertCWL } from "$lib/server/schema";
    import type { GridOptions, IDateFilterParams, ValueFormatterParams } from "@ag-grid-community/core";
    import { makeSvelteCellRenderer } from "ag-grid-svelte5-extended";

    interface Props {
        rowData: InsertCWL[];
        cwlClans: Array<{ tag: string; clanName: string }>;
        clanNames?: string[];
        editable?: boolean;
        currentUserId?: string | null;
        onCellValueChanged?: (data: InsertCWL) => void;
        onSortChanged?: (data: InsertCWL[]) => void;
        onRowSelected?: (rows: InsertCWL[]) => void;
    }

    let {
        rowData = $bindable(),
        cwlClans,
        clanNames = [],
        editable = false,
        currentUserId = null,
        onCellValueChanged,
        onSortChanged,
        onRowSelected
    }: Props = $props();

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

    const gridOptions = $derived<GridOptions<InsertCWL>>({
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
                filter: "agNumberColumnFilter",
                editable: editable
            },
            { field: "accountName", filter: true },
            { field: "accountTag", filter: true },
            {
                field: "accountClan",
                filter: true,
                editable: editable,
                cellEditor: editable ? "agSelectCellEditor" : undefined,
                cellEditorParams: editable
                    ? {
                          values: clanNames
                      }
                    : undefined
            },
            {
                field: "assignedTo",
                headerName: "Assigned To",
                filter: true,
                editable: editable,
                cellEditor: editable ? "agSelectCellEditor" : undefined,
                cellEditorParams: editable
                    ? {
                          values: cwlClans.map((clan) => clan.clanName)
                      }
                    : undefined,
                cellRenderer: !editable ? makeSvelteCellRenderer(ClanCWLTableWrapper) : undefined,
                cellRendererParams: !editable
                    ? {
                          cwlClans: cwlClans
                      }
                    : undefined,
                valueFormatter: editable
                    ? (params: ValueFormatterParams<InsertCWL, string>) => {
                          return cwlClans.find((clan) => clan.tag === params.data?.assignedTo)?.clanName || "";
                      }
                    : undefined,
                valueSetter: editable
                    ? (params) => {
                          const foundClan = cwlClans.find((clan) => clan.clanName === params.newValue);
                          if (foundClan) {
                              params.data.assignedTo = foundClan.tag;
                              return true;
                          }
                          return false;
                      }
                    : undefined
            },
            {
                field: "accountWeight",
                headerName: "Account Weight",
                filter: "agNumberColumnFilter",
                editable: editable,
                cellEditor: editable ? "agNumberCellEditor" : undefined,
                cellDataType: editable ? "number" : undefined
            },
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
                filterParams,
                editable: editable,
                cellEditor: editable ? "agDateCellEditor" : undefined,
                cellDataType: editable ? "date" : undefined
            },
            {
                field: "accountTag",
                headerName: "Account Details",
                cellRenderer: makeSvelteCellRenderer(UserDataCWLTableWrapper),
                filter: true
            }
        ],
        autoSizeStrategy: {
            type: "fitCellContents",
            skipHeader: false
        },
        pagination: true,
        paginationAutoPageSize: true,
        rowSelection: {
            mode: editable ? "multiRow" : "singleRow",
            checkboxes: editable,
            enableClickSelection: false
        },
        getRowStyle:
            !editable && currentUserId
                ? (params) => {
                      if (params.data?.userId === currentUserId) {
                          return { background: "#3B82F619" };
                      }
                      return undefined;
                  }
                : undefined,
        onRowSelected: onRowSelected
            ? (event) => {
                  const selectedRows = event.api.getSelectedRows();
                  onRowSelected?.(selectedRows);
              }
            : undefined,
        onCellValueChanged: onCellValueChanged
            ? async (event) => {
                  onCellValueChanged?.(event.data);
              }
            : undefined,
        onSortChanged: onSortChanged
            ? (event) => {
                  const sortedData: InsertCWL[] = [];
                  event.api.forEachNodeAfterFilterAndSort((node) => {
                      if (node.data) {
                          sortedData.push(node.data);
                      }
                  });
                  onSortChanged?.(sortedData);
              }
            : undefined
    });
</script>

<div class="size-full">
    <Grid {gridOptions} bind:rowData />
</div>
