<script lang="ts">
    import Seo from "$lib/components/ui/Seo.svelte";
    import { fadeIn } from "$lib/utils/animations";
    import { PreRendered } from "carta-md";
    import { onMount } from "svelte";
    import type { PageProps } from "./$types";

    let { data }: PageProps = $props();

    let content: HTMLElement | null = null;

    onMount(() => {
        if (content) fadeIn(content);
    });
</script>

<Seo title="Rules" description="The rules of JPA FWA Clans" />

<div class="typography rules container mx-auto max-w-7xl! py-4" bind:this={content}>
    <PreRendered html={data.rules} />
</div>

<style>
    :global(.rules :is([id], h1, h2, h3, h4, h5, h6)) {
        scroll-margin-top: calc(5rem + 0.5rem);
    }
</style>
