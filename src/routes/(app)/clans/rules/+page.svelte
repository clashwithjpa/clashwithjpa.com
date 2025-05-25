<script lang="ts">
    import type { PageData } from "./$types";
    import CocButton from "$lib/components/app/CocButton.svelte";
    import { onMount } from "svelte";
    import { fade } from "svelte/transition";
    import MaterialSymbolsArrowUpwardRounded from "~icons/material-symbols/arrow-upward-rounded";

    let { data }: { data: PageData } = $props();

    let showScrollButton = $state(false);
    onMount(() => {
        const handleScroll = () => {
            showScrollButton = window.scrollY > 100;
        };
        window.addEventListener("scroll", handleScroll);
        window.addEventListener("keydown", (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                window.scrollTo({ top: 0, behavior: "smooth" });
            }
        });
    });
</script>

<svelte:head>
    <title>JPA | Rules</title>
</svelte:head>

<div class="mt-32 flex w-full flex-col items-start gap-5 px-5 pb-5 lg:flex-row lg:px-10">
    {#if showScrollButton}
        <div transition:fade={{ duration: 200 }} class="fixed right-4 bottom-4 z-10">
            <CocButton
                onclick={() => {
                    window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                class="group size-11"
                size=""
            >
                <MaterialSymbolsArrowUpwardRounded class="size-5 transition-transform group-hover:-translate-y-1 " />
            </CocButton>
        </div>
    {/if}
    <div
        class="prose-a:text-indigo-400 prose-blockquote:not-italic prose-blockquote:text-green-400 w-full flex-1 pt-5 marker:text-orange-400 lg:pt-0 lg:pl-5"
    >
        <article class="prose prose-invert w-full max-w-none">
            <!-- eslint-disable-next-line svelte/no-at-html-tags -->
            {@html data.rules.content}
        </article>
    </div>
</div>
