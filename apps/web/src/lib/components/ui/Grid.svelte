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
        rowData?: GridOptions["rowData"];
        columnDefs: GridOptions["columnDefs"];
        gridOptions?: Omit<GridOptions, "rowData" | "columnDefs">;
        class?: string;
    }

    let { rowData, columnDefs, gridOptions = {}, class: className = "" }: Props = $props();

    let gridContainer: HTMLDivElement;
    let gridApi: GridApi | undefined = $state();

    function sizeColumns(api: GridApi, containerWidth: number) {
        api.autoSizeAllColumns();
        const cols = api.getColumns();
        if (cols) {
            const totalWidth = cols.reduce((sum, col) => sum + col.getActualWidth(), 0);
            if (totalWidth < containerWidth) {
                api.sizeColumnsToFit();
            }
        }
    }

    onMount(() => {
        const options: GridOptions = {
            theme: "legacy",
            enableCellTextSelection: true,
            ensureDomOrder: true,
            multiSortKey: "ctrl",
            ...gridOptions,
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
                // Svelte cell renderers need a tick to lay out their DOM before measuring.
                sizeColumns(params.api, gridContainer.clientWidth);
                setTimeout(() => sizeColumns(params.api, gridContainer.clientWidth), 50);
                if (gridOptions.onFirstDataRendered) {
                    gridOptions.onFirstDataRendered(params);
                }
            },
            onGridSizeChanged: (params) => {
                sizeColumns(params.api, params.clientWidth);
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

        /* Drive the accent (focus rings, active items) off the Stone palette so
           popups don't fall back to AG Grid's default blue. */
        --ag-active-color: var(--color-stone-200);
        /* Focused/selected cell outline — quartz defaults to a bright glare. */
        --ag-range-selection-border-color: var(--color-stone-400);
        --ag-range-selection-background-color: color-mix(in srgb, var(--color-stone-700) 25%, transparent);
        --ag-input-border-color: color-mix(in srgb, var(--color-stone-700) 50%, transparent);
        --ag-input-focus-border-color: var(--color-stone-700);
        --ag-input-focus-box-shadow: none;
        --ag-border-radius: 8px; /* rounded-lg */
        --ag-card-radius: 8px; /* rounded-lg */
        /* Inline-editing cells elevate via this shadow; quartz defaults to a
           white glow, so swap it for a thin Stone ring that matches the UI. */
        --ag-card-shadow: 0 0 0 1px var(--color-stone-700);
        /* Font-based icons (sort arrows, menu) follow tertiary text. */
        --ag-icon-font-color: var(--color-stone-400);
        /* The filter search icon is a black SVG recolored via this filter; the
           light quartz theme leaves it undefined, so invert it for dark mode. */
        --ag-icon-filter: invert(1);
    }

    /* Filter & column menu popup: surface background, Stone border, rounded-lg.
       Only the outer .ag-menu carries the border — the nested .ag-filter just
       inherits the surface, otherwise the two stack into a doubled border. */
    :global(.ag-theme-quartz .ag-menu) {
        background-color: var(--color-stone-900);
        border: 2px solid color-mix(in srgb, var(--color-stone-700) 50%, transparent);
        border-radius: var(--radius-lg, 8px);
        color: var(--color-stone-200);
    }

    :global(.ag-theme-quartz .ag-filter) {
        background-color: var(--color-stone-900);
        color: var(--color-stone-200);
    }

    /* The "Begins with" picker and text/number filter inputs all carry their
       border on the wrapper that holds the icon + input, so style that. The
       :not() keeps checkbox cells (which share .ag-input-wrapper) untouched. */
    :global(.ag-theme-quartz .ag-picker-field-wrapper),
    :global(.ag-theme-quartz .ag-input-wrapper:not(.ag-checkbox-input-wrapper)) {
        background-color: var(--color-stone-900);
        border: 2px solid color-mix(in srgb, var(--color-stone-700) 50%, transparent);
        border-radius: var(--radius-lg, 8px);
        box-shadow: none;
        transition: border-color 200ms ease-in-out;
    }

    :global(.ag-theme-quartz .ag-picker-field-wrapper:focus-within),
    :global(.ag-theme-quartz .ag-input-wrapper:not(.ag-checkbox-input-wrapper):focus-within) {
        border-color: var(--color-stone-700);
        box-shadow: 0 0 0 4px color-mix(in srgb, var(--color-stone-700) 50%, transparent);
        outline: none;
    }

    /* The <input> itself sits transparent inside the bordered wrapper. */
    :global(.ag-theme-quartz .ag-input-field-input) {
        background-color: transparent;
        border: none;
        color: var(--color-stone-50);
        box-shadow: none;
    }

    /* Placeholder follows tertiary text, like Input.svelte. */
    :global(.ag-theme-quartz .ag-input-field-input::placeholder) {
        color: var(--color-stone-400);
    }

    /* Filter/menu icons (search, dropdown arrow) → tertiary text. */
    :global(.ag-theme-quartz .ag-icon) {
        color: var(--color-stone-400);
    }

    /* Dropdown list of options (Contains, Equals, Begins with…). */
    :global(.ag-theme-quartz .ag-select-list),
    :global(.ag-theme-quartz .ag-list) {
        background-color: var(--color-stone-900);
        border: 2px solid color-mix(in srgb, var(--color-stone-700) 50%, transparent);
        border-radius: var(--radius-lg, 8px);
        padding: 4px;
    }

    :global(.ag-theme-quartz .ag-list-item) {
        border-radius: var(--radius-lg, 8px);
        color: var(--color-stone-200);
        cursor: pointer;
        transition: background-color 200ms ease-in-out;
    }

    :global(.ag-theme-quartz .ag-list-item:hover),
    :global(.ag-theme-quartz .ag-list-item.ag-active-item) {
        background-color: color-mix(in srgb, var(--color-stone-700) 50%, transparent);
        color: var(--color-stone-50);
    }

    /* Apply/Clear buttons in the filter footer. */
    :global(.ag-theme-quartz .ag-standard-button) {
        background-color: var(--color-stone-800);
        border: 2px solid color-mix(in srgb, var(--color-stone-700) 50%, transparent);
        border-radius: var(--radius-lg, 8px);
        color: var(--color-stone-50);
        transition:
            background-color 200ms ease-in-out,
            color 200ms ease-in-out;
    }

    :global(.ag-theme-quartz .ag-standard-button:hover) {
        background-color: var(--color-stone-700);
        color: var(--color-stone-50);
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

    :global(.ag-cell) {
        display: flex;
        align-items: center;
        width: 100%;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        cursor: text;
    }

    /* Target the internal wrappers AG Grid uses for framework components */
    :global(.ag-cell .ag-react-container),
    :global(.ag-cell .ag-cell-wrapper) {
        width: 100%;
        height: 100%;
        display: flex;
    }
</style>
