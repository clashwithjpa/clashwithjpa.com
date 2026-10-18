<script lang="ts">
    import SvgSpinnersRingResize from "~icons/svg-spinners/ring-resize";
    import Pill from "./Pill.svelte";

    // Without a value it spins. With one (0 to 1) it fills a ring.
    let { label, detail, value }: { label: string; detail?: string; value?: number } = $props();

    const R = 13;
    const C = 2 * Math.PI * R;
</script>

<Pill title={label} subtitle={detail ?? (value != null ? `${Math.round(value * 100)}%` : undefined)}>
    {#snippet lead()}
        {#if value == null}
            <SvgSpinnersRingResize class="size-5 text-amber-300" />
        {:else}
            <svg class="size-8 -rotate-90" viewBox="0 0 32 32" fill="none">
                <circle cx="16" cy="16" r={R} class="stroke-stone-700" stroke-width="3" />
                <circle
                    cx="16"
                    cy="16"
                    r={R}
                    class="stroke-amber-400 transition-[stroke-dashoffset] duration-300"
                    stroke-width="3"
                    stroke-linecap="round"
                    stroke-dasharray={C}
                    stroke-dashoffset={C * (1 - Math.min(Math.max(value, 0), 1))}
                />
            </svg>
        {/if}
    {/snippet}
</Pill>
