<script lang="ts">
    import RoleBadge from "$lib/components/ui/RoleBadge.svelte";
    import type { ICellRendererParams } from "ag-grid-community";

    let { params }: { params: ICellRendererParams } = $props();

    let role = $derived(params.value);
</script>

<div class="flex h-full w-full items-center px-1">
    {#if role}
        <RoleBadge {role} />
    {/if}
</div>
