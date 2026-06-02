<script lang="ts">
    import Badge from "$lib/components/ui/Badge.svelte";
    import type { ICellRendererParams } from "ag-grid-community";
    import SvgSpinnersRingResize from "~icons/svg-spinners/ring-resize";
    import TablerAlertTriangle from "~icons/tabler/alert-triangle";
    import TablerArrowsExchange from "~icons/tabler/arrows-exchange";
    import TablerCheck from "~icons/tabler/check";
    import TablerX from "~icons/tabler/x";

    // params.value is the join status; params.wrongClan (when "wrong-clan") names the clan
    // the applicant is actually in.
    let { params }: { params: ICellRendererParams & { wrongClan?: string } } = $props();
    let status = $derived(params.value as string);
    let wrongClan = $derived(params.wrongClan ?? "");
</script>

<div class="flex h-full w-full items-center gap-1.5 px-1" title={status === "wrong-clan" && wrongClan ? `Currently in ${wrongClan}` : undefined}>
    {#if status === "joined"}
        <Badge variant="green" content="In clan" icon={TablerCheck} />
    {:else if status === "wrong-clan"}
        <div class="flex min-w-0 flex-col items-start gap-0.5">
            <Badge variant="blue" content="Wrong clan" icon={TablerArrowsExchange} />
            {#if wrongClan}
                <span class="max-w-full truncate text-xs text-stone-400">{wrongClan}</span>
            {/if}
        </div>
    {:else if status === "missing"}
        <Badge variant="yellow" content="Not in clan" icon={TablerX} />
    {:else if status === "error"}
        <Badge variant="red" content="Check failed" icon={TablerAlertTriangle} />
    {:else if status === "unknown"}
        <Badge variant="ghost" content="…" icon={SvgSpinnersRingResize} />
    {:else}
        <span class="text-stone-500">—</span>
    {/if}
</div>
