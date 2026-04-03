<script lang="ts">
    import ClanCard from "$lib/components/coc/ClanCard.svelte";
    import H1 from "$lib/components/ui/coc/H1.svelte";
    import Seo from "$lib/components/ui/Seo.svelte";
    import { fadeIn, fadeUp } from "$lib/utils/animations";
    import TablerX from "~icons/tabler/x";
    import type { PageProps } from "./$types";

    let { data }: PageProps = $props();

    $effect(() => {
        fadeIn(document.querySelector(".page-title") as HTMLElement);
        fadeUp(document.querySelector(".page-desc") as HTMLElement);
        fadeIn(document.querySelector(".clan-cards") as HTMLElement);
    });
</script>

<Seo title="Clans" description="Explore our family of Fair War Alliance clans. Join our community and participate in strategic clan wars." />

<div class="container mx-auto flex min-h-screen flex-col gap-8">
    <div class="flex flex-col items-center gap-4 text-center">
        <H1 class="page-title text-4xl opacity-0 md:text-6xl">JPA Clans</H1>
        <p class="page-desc max-w-2xl font-coc text-lg text-stone-200 opacity-0 md:text-xl">
            Explore our family of Fair War Alliance clans. Join our community and participate in strategic clan wars.
        </p>
    </div>

    <br />

    <!-- Clans Grid -->
    {#if data.clans.success && Object.keys(data.clans.data.clans).length > 0}
        <div class="clan-cards grid grid-cols-1 gap-6 opacity-0 md:grid-cols-2 lg:grid-cols-3">
            {#each Object.entries(data.clans.data.clans) as [clanTag, requirements], index}
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
