<script lang="ts">
    import { ClientSideRowModelModule } from "@ag-grid-community/client-side-row-model";
    import type { GridOptions } from "@ag-grid-community/core";
    import { themeQuartz } from "@ag-grid-community/theming";
    import { AgGrid } from "ag-grid-svelte5-extended";

    interface Props {
        rowData: any[];
        gridOptions: GridOptions;
    }

    let { rowData = $bindable(), gridOptions }: Props = $props();

    const theme = themeQuartz.withParams({
        backgroundColor: "var(--card)",
        browserColorScheme: "dark",
        chromeBackgroundColor: {
            ref: "foregroundColor",
            mix: 0.07,
            onto: "backgroundColor"
        },
        foregroundColor: "var(--card-foreground)",
        headerFontSize: 14,
        borderRadius: "var(--radius)",
        checkboxBorderRadius: "var(--radius-md)",
        focusShadow: "var(--background)",
        dropdownShadow: {
            radius: 8,
            color: "var(--card)"
        },
        accentColor: "var(--accent-foreground)"
    });

    gridOptions = { ...gridOptions, theme };
</script>

<AgGrid {gridOptions} {rowData} modules={[ClientSideRowModelModule]} />
