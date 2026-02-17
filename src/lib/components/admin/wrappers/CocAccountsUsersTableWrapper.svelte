<script lang="ts">
    import type { ICellRendererParams } from "@ag-grid-community/core";
    import CocAccounts from "../CocAccounts.svelte";

    let params: ICellRendererParams = $props();
</script>

<CocAccounts cocAccounts={params.data.cocAccounts} />
