<script lang="ts">
    import TablerMusic from "~icons/tabler/music";
    import Pill from "./Pill.svelte";

    let { title, subtitle }: { title: string; subtitle?: string } = $props();
</script>

<Pill {title} {subtitle}>
    {#snippet lead()}
        <span class="grid size-8 place-items-center rounded-lg bg-lime-900 text-lime-200"><TablerMusic class="size-4" /></span>
    {/snippet}
    {#snippet trail()}
        <span class="flex h-4 items-end gap-0.5" aria-hidden="true">
            {#each [0, 200, 400] as delay (delay)}
                <span class="island-eq w-0.75 rounded-full bg-lime-400" style:animation-delay="{delay}ms"></span>
            {/each}
        </span>
    {/snippet}
</Pill>

<style>
    .island-eq {
        height: 4px;
        animation: island-eq 1s ease-in-out infinite;
    }

    @keyframes island-eq {
        50% {
            height: 16px;
        }
    }

    @media (prefers-reduced-motion: reduce) {
        .island-eq {
            animation: none;
            height: 10px;
        }
    }
</style>
