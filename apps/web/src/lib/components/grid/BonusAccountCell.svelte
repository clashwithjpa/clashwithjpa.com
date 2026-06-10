<script lang="ts">
    import Badge from "$lib/components/ui/Badge.svelte";
    import Button from "$lib/components/ui/Button.svelte";
    import Icon from "$lib/components/ui/Icon.svelte";
    import Tooltip from "$lib/components/ui/Tooltip.svelte";
    import type { ICellRendererParams } from "ag-grid-community";
    import TablerEye from "~icons/tabler/eye";
    import TablerWorld from "~icons/tabler/world";

    let { params }: { params: ICellRendererParams } = $props();
    let account = $derived(params.data || null);

    function openDetails() {
        if (account) params.context?.openAccountSidebar?.(account);
    }
</script>

{#if account}
    <div class="flex h-full w-full items-center gap-2 px-2">
        {#if account.townHall}
            <Tooltip title={`Town Hall ${account.townHall}`} placement="top">
                <Icon name="th/{account.townHall}" class="size-10 shrink-0" />
            </Tooltip>
        {/if}
        <div class="flex min-w-0 flex-col justify-center">
            <span class="truncate text-sm font-medium text-stone-100">{account.cocAccountName}</span>
            <span class="truncate font-mono text-xs text-stone-400">{account.cocAccountTag}</span>
        </div>
        {#if account.isExternal}
            <Badge variant="red" content="External" icon={TablerWorld} class="shrink-0" />
        {/if}
        <!-- Stop mousedown so the grid doesn't treat the click as a cell/row interaction. -->
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <div class="ml-auto shrink-0" onmousedown={(e) => e.stopPropagation()}>
            <Button size="icon" variant="ghost" tooltip="View account details" tooltipPlacement="top" onclick={openDetails}>
                <TablerEye class="size-5" />
            </Button>
        </div>
    </div>
{/if}
