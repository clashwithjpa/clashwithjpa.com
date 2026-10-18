<script lang="ts">
    import Badge from "$lib/components/ui/Badge.svelte";
    import Button from "$lib/components/ui/Button.svelte";
    import Icon from "$lib/components/ui/Icon.svelte";
    import Tooltip from "$lib/components/ui/Tooltip.svelte";
    import TablerEye from "~icons/tabler/eye";
    import TablerWorld from "~icons/tabler/world";

    let {
        account,
        onOpen,
    }: {
        account: { townHall?: number | null; cocAccountName: string; cocAccountTag: string; isExternal?: boolean };
        onOpen: () => void;
    } = $props();
</script>

<div class="flex w-full items-center gap-2">
    {#if account.townHall}
        <Tooltip title={`Town Hall ${account.townHall}`} placement="top">
            <Icon name="th/{account.townHall}" class="size-10 shrink-0" />
        </Tooltip>
    {/if}
    <div class="flex min-w-0 flex-1 flex-col justify-center">
        <span class="truncate text-sm font-medium text-stone-100">{account.cocAccountName}</span>
        <span class="truncate font-mono text-xs text-stone-400">{account.cocAccountTag}</span>
    </div>
    <!-- Kept beside the eye button so badges line up down the column instead of trailing each name. -->
    <div class="flex shrink-0 items-center gap-2">
        {#if account.isExternal}
            <Badge variant="red" content="External" icon={TablerWorld} />
        {/if}
        <Button size="icon" variant="ghost" tooltip="View account details" tooltipPlacement="top" onclick={onOpen}>
            <TablerEye />
        </Button>
    </div>
</div>
