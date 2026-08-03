<script lang="ts">
    import ClanCard from "$lib/components/coc/ClanCard.svelte";
    import H1 from "$lib/components/ui/coc/H1.svelte";
    import Seo from "$lib/components/ui/Seo.svelte";
    import TablerX from "~icons/tabler/x";
    import type { PageProps } from "./$types";

    let { data }: PageProps = $props();
</script>

<Seo title="Clans" description="Explore our family of Fair War Alliance clans. Join our community and participate in strategic clan wars." />

<div class="container mx-auto flex min-h-screen flex-col gap-8">
    <div class="flex flex-col items-center gap-4 text-center">
        <H1 class="animate-in text-4xl duration-800 ease-glide fill-mode-both fade-in md:text-6xl">JPA Clans</H1>
        <p
            class="max-w-2xl animate-in font-coc text-lg text-stone-200 duration-200 ease-glide fill-mode-both fade-in slide-in-from-bottom md:text-xl"
        >
            Explore our family of Fair War Alliance clans. Join our community and participate in strategic clan wars.
        </p>
    </div>

    <br />

    {#if data.clans?.success && Object.keys(data.clans.data.clans).length > 0}
        <div class="grid animate-in grid-cols-1 gap-6 duration-800 ease-glide fill-mode-both fade-in md:grid-cols-2 lg:grid-cols-3">
            {#each Object.entries(data.clans.data.clans) as [clanTag, requirements], index (clanTag)}
                <div class="h-full">
                    <ClanCard {clanTag} {requirements} delay={index * 200} class="h-full" />
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
