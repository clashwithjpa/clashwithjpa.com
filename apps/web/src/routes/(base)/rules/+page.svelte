<script lang="ts">
    import H1 from "$lib/components/ui/coc/H1.svelte";
    import Seo from "$lib/components/ui/Seo.svelte";
    import { fadeIn, fadeUp } from "$lib/utils/animations";
    import { PreRendered } from "carta-md";
    import type { PageProps } from "./$types";

    let { data }: PageProps = $props();

    $effect(() => {
        fadeIn(document.querySelector(".page-title") as HTMLElement);
        fadeUp(document.querySelector(".page-desc") as HTMLElement);
        fadeIn(document.querySelector(".rules") as HTMLElement);
    });
</script>

<Seo
    title="Rules"
    description="
            Discover the official rules and guidelines for JPA FWA Clans. Learn about member conduct, war rules, and more to ensure a positive gaming
            experience."
/>

<div class="container mx-auto">
    <div class="flex flex-col items-center gap-4 text-center">
        <H1 class="page-title text-4xl opacity-0 md:text-6xl">JPA Rules</H1>
        <p class="page-desc max-w-2xl font-coc text-lg text-stone-200 opacity-0 md:text-xl">
            Discover the official rules and guidelines for JPA FWA Clans. Learn about member conduct, war rules, and more to ensure a positive gaming
            experience.
        </p>
    </div>

    <br />

    <div class="typography rules max-w-7xl!">
        <PreRendered html={data.rules} />
    </div>
</div>

<style>
    :global(.rules :is([id], h1, h2, h3, h4, h5, h6)) {
        scroll-margin-top: calc(5rem + 0.5rem);
    }
</style>
