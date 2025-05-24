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
        backgroundColor: "#030712", // gray-900
        browserColorScheme: "dark",
        chromeBackgroundColor: {
            ref: "foregroundColor",
            mix: 0.07,
            onto: "backgroundColor"
        },
        foregroundColor: "#F9FAFB", // gray-50
        headerFontSize: 14,
        borderRadius: 8, // rounded-lg
        checkboxBorderRadius: 6, // rounded-md
        focusShadow: "",
        dropdownShadow: {
            radius: 8,
            color: "#1F2937" // gray-800
        }
    });

    gridOptions = { ...gridOptions, theme };
</script>

<AgGrid {gridOptions} {rowData} modules={[ClientSideRowModelModule]} />
