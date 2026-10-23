<script lang="ts">
    import Badge from "$lib/components/ui/Badge.svelte";
    import Button from "$lib/components/ui/Button.svelte";
    import Tooltip from "$lib/components/ui/Tooltip.svelte";
    import TownHall from "$lib/components/ui/TownHall.svelte";
    import TablerEye from "~icons/tabler/eye";
    import TablerWorld from "~icons/tabler/world";

    let { account, onOpen }: { account: { townHall?: number | null; cocAccountTag: string; isExternal?: boolean }; onOpen: () => void } = $props();
</script>

<div class="flex w-full items-center gap-2">
    {#if account.townHall}
        <Tooltip title={`Town Hall ${account.townHall}`} placement="top">
            <TownHall level={account.townHall} class="size-10" />
        </Tooltip>
    {/if}
    <div class="flex min-w-0 flex-col justify-center">
        <span class="truncate font-mono text-sm font-medium text-stone-200">{account.cocAccountTag}</span>
        {#if account.isExternal}
            <Badge variant="red" content="External" icon={TablerWorld} class="mt-0.5" />
        {/if}
    </div>
    <div class="ml-auto">
        <Button size="icon" variant="ghost" tooltip="View account details" tooltipPlacement="top" onclick={onOpen}>
            <TablerEye />
        </Button>
    </div>
</div>
