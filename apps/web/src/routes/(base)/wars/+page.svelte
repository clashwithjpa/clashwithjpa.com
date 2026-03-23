<script lang="ts">
    import WarCard from "$lib/components/coc/WarCard.svelte";
    import H1 from "$lib/components/ui/coc/H1.svelte";
    import Seo from "$lib/components/ui/Seo.svelte";
    import { fadeIn, fadeUp } from "$lib/utils/animations";
    import TablerX from "~icons/tabler/x";
    import type { PageProps } from "./$types";

    let { data }: PageProps = $props();

    $effect(() => {
        fadeIn(document.querySelector(".page-title") as HTMLElement);
        fadeUp(document.querySelectorAll(".page-desc"));
        fadeIn(document.querySelectorAll(".war-card"));
    });
</script>

<Seo title="Wars" description="Track all active clan wars across the JPA family. Real-time war stats, attack progress, and battle day countdowns." />

<div class="container mx-auto flex min-h-screen flex-col gap-8 px-4 py-8 md:px-6 md:py-12">
    <div class="flex flex-col items-center gap-4 text-center">
        <H1 class="page-title text-4xl opacity-0 md:text-6xl">JPA Wars</H1>
        <p class="page-desc max-w-2xl font-coc text-lg text-stone-200 opacity-0 md:text-xl">
            Track all active clan wars across the JPA family. Real-time war stats, attack progress, and battle day countdowns.
        </p>
    </div>

    <br />

    <!-- Wars Grid -->
    {#if data.clans.success && data.clans.data.clans.length > 0}
        <div class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {#each data.clans.data.clans as clanTag, index}
                <div class="war-card opacity-0">
                    <WarCard {clanTag} delay={index * 200} />
                </div>
            {/each}
        </div>
    {:else}
        <div class="flex flex-col items-center justify-center gap-4 py-12 text-center text-red-700">
            <TablerX class="size-14" />
            <p class="font-coc text-xl">No clans found</p>
        </div>
    {/if}
</div>
