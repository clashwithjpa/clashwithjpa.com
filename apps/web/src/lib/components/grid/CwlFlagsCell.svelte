<script lang="ts">
    import Badge from "#lib/components/ui/Badge.svelte";
    import Tooltip from "#lib/components/ui/Tooltip.svelte";
    import type { Component } from "svelte";
    import TablerArmchair from "~icons/tabler/armchair";
    import TablerCoins from "~icons/tabler/coins";
    import TablerRepeat from "~icons/tabler/repeat";
    import TablerStarHalf from "~icons/tabler/star-half";
    import TablerStarOff from "~icons/tabler/star-off";
    import TablerSwordOff from "~icons/tabler/sword-off";

    let {
        topDonorOf = 0,
        b2b = 0,
        missed = 0,
        zeroStars = 0,
        starSteals = 0,
        benched = 0,
        loading = false,
    }: {
        topDonorOf?: number;
        b2b?: number;
        missed?: number;
        zeroStars?: number;
        starSteals?: number;
        benched?: number;
        loading?: boolean;
    } = $props();

    type Flag = { content: string; title: string; icon: Component; variant: "yellow" | "purple" | "red" | "orange" | "ghost" };

    let flags = $derived(
        [
            topDonorOf > 0 && {
                content: "Top donor",
                title: `In the clan's top ${topDonorOf} donors among eligible players (6 + war wins)`,
                icon: TablerCoins,
                variant: "yellow",
            },
            b2b > 0 && { content: `B2B ${b2b}`, title: `Bonus in ${b2b} of the last 6 seasons`, icon: TablerRepeat, variant: "purple" },
            missed > 0 && { content: `Missed ×${missed}`, title: "In the lineup but didn't attack", icon: TablerSwordOff, variant: "red" },
            zeroStars > 0 && { content: `0★ ×${zeroStars}`, title: "Attacks that got no stars", icon: TablerStarOff, variant: "red" },
            starSteals > 0 && {
                content: `Star steal ×${starSteals}`,
                title: "With 8★ already, hit a base 3+ places lower while a base in reach was still untouched",
                icon: TablerStarHalf,
                variant: "orange",
            },
            benched > 0 && { content: `Benched ×${benched}`, title: "Rounds left out of the lineup", icon: TablerArmchair, variant: "ghost" },
        ].filter(Boolean) as Flag[],
    );
</script>

{#if flags.length > 0}
    <div class="flex flex-wrap items-center gap-1">
        {#each flags as f (f.content)}
            <Tooltip title={f.title} placement="top">
                <Badge variant={f.variant} content={f.content} icon={f.icon} />
            </Tooltip>
        {/each}
    </div>
{:else if loading}
    <span class="block h-3.5 w-16 skeleton"></span>
{:else}
    <span class="text-stone-600">—</span>
{/if}
