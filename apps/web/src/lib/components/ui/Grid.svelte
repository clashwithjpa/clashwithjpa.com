<script lang="ts">
    import { AllCommunityModule, createGrid, ModuleRegistry, type GridApi, type GridOptions } from "ag-grid-community";
    import "ag-grid-community/styles/ag-grid.css";
    import "ag-grid-community/styles/ag-theme-quartz.css";
    import { onDestroy, onMount } from "svelte";
    import GridInputEditor from "./grid/editors/GridInputEditor.svelte";
    import GridSelectEditor from "./grid/editors/GridSelectEditor.svelte";
    import { svelteEditor } from "./grid/SvelteCellEditor";

    ModuleRegistry.registerModules([AllCommunityModule]);

    interface Props {
        rowData: GridOptions["rowData"];
        columnDefs: GridOptions["columnDefs"];
        gridOptions?: Omit<GridOptions, "rowData" | "columnDefs">;
        class?: string;
    }

    let { rowData, columnDefs, gridOptions = {}, class: className = "" }: Props = $props();

    let gridContainer: HTMLDivElement;
    let gridApi: GridApi | undefined = $state();

    onMount(() => {
        const options: GridOptions = {
            theme: "legacy",
            ...gridOptions,
            defaultColDef: {
                minWidth: 100, // Safe minimum to prevent extreme squishing
                ...(gridOptions.defaultColDef || {}),
            },
            components: {
                // Register ui component wrappers so they can be natively mapped within AG Grid
                uiSelectEditor: svelteEditor(GridSelectEditor),
                uiInputEditor: svelteEditor(GridInputEditor),
                ...(gridOptions.components || {}),
            },
            rowData,
            columnDefs,
            onGridReady: (params) => {
                gridApi = params.api;
                if (gridOptions.onGridReady) {
                    gridOptions.onGridReady(params);
                }
            },
            onFirstDataRendered: (params) => {
                if (gridContainer.clientWidth > 768) {
                    params.api.sizeColumnsToFit();
                } else {
                    // Svelte components might take a tick to fully render their DOM inner width.
                    setTimeout(() => params.api.autoSizeAllColumns(), 50);
                }
                if (gridOptions.onFirstDataRendered) {
                    gridOptions.onFirstDataRendered(params);
                }
            },
            onGridSizeChanged: (params) => {
                if (params.clientWidth > 768) {
                    params.api.sizeColumnsToFit();
                } else {
                    params.api.autoSizeAllColumns();
                }
                if (gridOptions.onGridSizeChanged) {
                    gridOptions.onGridSizeChanged(params);
                }
            },
        };

        createGrid(gridContainer, options);
    });

    onDestroy(() => {
        if (gridApi) {
            gridApi.destroy();
        }
    });

    $effect(() => {
        if (gridApi && rowData) {
            gridApi.setGridOption("rowData", rowData);
        }
    });

    $effect(() => {
        if (gridApi && columnDefs) {
            gridApi.setGridOption("columnDefs", columnDefs);
        }
    });
</script>

<div class="ag-theme-quartz h-full w-full {className}" bind:this={gridContainer}></div>

<style>
    :global(.ag-theme-quartz) {
        --ag-background-color: var(--color-stone-950);
        --ag-foreground-color: var(--color-stone-50);
        --ag-border-color: color-mix(in srgb, var(--color-stone-700) 50%, transparent);
        --ag-header-background-color: var(--color-stone-900);
        --ag-header-foreground-color: var(--color-stone-200);
        --ag-row-hover-color: var(--color-stone-900);

        --ag-selected-row-background-color: var(--color-stone-800);
        --ag-odd-row-background-color: var(--color-stone-950);
        --ag-control-panel-background-color: var(--color-stone-900);
        --ag-tooltip-background-color: var(--color-stone-900);
        --ag-data-color: var(--color-stone-200);

        --ag-row-border-color: color-mix(in srgb, var(--color-stone-700) 50%, transparent);
        --ag-cell-horizontal-border: solid color-mix(in srgb, var(--color-stone-700) 50%, transparent);
        --ag-borders-row: solid 1px color-mix(in srgb, var(--color-stone-700) 50%, transparent);

        /* The guideline states border-width border-2 but keeping 1px for cell borders is often necessary natively. However, for the wrapper we use border-2! */
        --ag-borders: solid 2px color-mix(in srgb, var(--color-stone-700) 50%, transparent);
        --ag-wrapper-border-radius: 0;

        --ag-secondary-foreground-color: var(--color-stone-400);

        --ag-font-family: inherit;
        --ag-row-height: 48px; /* multiple of 8 */
        --ag-header-height: 48px;
        --ag-list-item-height: 32px;
    }

    :global(.ag-theme-quartz .ag-header) {
        border-bottom: solid 2px color-mix(in srgb, var(--color-stone-700) 50%, transparent);
    }

    :global(.ag-theme-quartz .ag-row) {
        border-bottom: solid 1px color-mix(in srgb, var(--color-stone-700) 50%, transparent);
    }

    :global(.ag-theme-quartz .ag-dnd-ghost) {
        background-color: var(--color-stone-800) !important;
        border: 2px solid color-mix(in srgb, var(--color-stone-700) 50%, transparent) !important;
        color: var(--color-stone-200) !important;
        border-radius: var(--radius-lg, 8px) !important;
        box-shadow: none !important;
    }

    /* Style the active popup editor */
    :global(.ag-theme-quartz .ag-popup-editor) {
        border-radius: var(--radius-lg, 8px) !important;
        border: none !important;
        background: transparent !important;
        box-shadow: none !important;
        padding: 0 !important;
    }
</style>
