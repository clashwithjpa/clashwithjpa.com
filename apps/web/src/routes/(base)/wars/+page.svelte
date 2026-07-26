<script lang="ts">
    import WarCard from "$lib/components/coc/WarCard.svelte";
    import H1 from "$lib/components/ui/coc/H1.svelte";
    import Seo from "$lib/components/ui/Seo.svelte";
    import TablerX from "~icons/tabler/x";
    import type { PageProps } from "./$types";

    let { data }: PageProps = $props();
</script>

<Seo title="Wars" description="Track all active clan wars across the JPA family. Real-time war stats, attack progress, and battle day countdowns." />

<div class="container mx-auto flex min-h-screen flex-col gap-8">
    <div class="flex flex-col items-center gap-4 text-center">
        <H1 class="animate-in text-4xl duration-800 ease-glide fill-mode-both fade-in md:text-6xl">JPA Wars</H1>
        <p
            class="max-w-2xl animate-in font-coc text-lg text-stone-200 duration-200 ease-glide fill-mode-both fade-in slide-in-from-bottom md:text-xl"
        >
            Track all active clan wars across the JPA family. Real-time war stats, attack progress, and battle day countdowns.
        </p>
    </div>

    <br />

    {#if data.clans?.success && Object.keys(data.clans.data.clans).length > 0}
        <div class="grid animate-in grid-cols-1 gap-6 duration-800 ease-glide fill-mode-both fade-in md:grid-cols-2 lg:grid-cols-3">
            {#each Object.keys(data.clans.data.clans) as clanTag, index}
                <div class="h-full">
                    <WarCard {clanTag} delay={index * 200} class="h-full" />
                </div>
            {/each}
        </div>
    {:else}
        <div class="flex flex-col items-center justify-center gap-4 text-center text-red-700">
            <TablerX class="size-14" />
            <p class="font-coc text-xl">No clans found</p>
        </div>
    {/if}
</div>
