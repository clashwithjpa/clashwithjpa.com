<script lang="ts">
    import { categorizeByRole } from "$lib/coc/clan";
    import Button from "$lib/components/Button.svelte";
    import InlineLink from "$lib/components/InlineLink.svelte";
    import { onMount, type Component } from "svelte";
    import { fade, slide } from "svelte/transition";
    import MaterialSymbolsArrowDownwardRounded from "~icons/material-symbols/arrow-downward-rounded";
    import MaterialSymbolsArrowUpwardRounded from "~icons/material-symbols/arrow-upward-rounded";
    import PhArrowUpRightBold from "~icons/ph/arrow-up-right-bold";
    import order from "../../../../data/clans/components/order.json";
    import type { PageData } from "./$types";

    let { data }: { data: PageData } = $props();

    const commonComponentFiles: Record<string, object> = import.meta.glob("../../../../data/clans/components/*.md", { eager: true });
    const commonComponentOrder: string[] = JSON.parse(JSON.stringify(order));
    const basePath = "../../../../data/clans/components/";

    let showCoLeaders: boolean = $state(false);
    let members = $derived.by(() => categorizeByRole(data.clan.clanData?.memberList ?? []));

    const sortedCommonComponentFiles: Record<string, { default: Component }> = Object.entries(commonComponentFiles)
        .sort(([a], [b]) => {
            const aIndex = commonComponentOrder.indexOf(a.replace(basePath, ""));
            const bIndex = commonComponentOrder.indexOf(b.replace(basePath, ""));
            return aIndex - bIndex;
        })
        .reduce((obj, [key, value]) => ({ ...obj, [key]: value }), {});

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
    <title>{data.meta.title} | {data.tag}</title>
    <meta property="og:type" content="article" />
    <meta property="og:title" content={data.meta.title} />
</svelte:head>

<div class="mt-32 flex w-full flex-col items-start gap-5 px-5 pb-5 lg:flex-row lg:px-10">
    {#if showScrollButton}
        <div transition:fade={{ duration: 200 }} class="fixed bottom-4 right-4 z-10">
            <Button
                onclick={() => {
                    window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                class="group size-11"
            >
                <MaterialSymbolsArrowUpwardRounded class="size-5 transition-transform group-hover:-translate-y-1 " />
            </Button>
        </div>
    {/if}
    <div class="flex w-full flex-col items-start space-y-4 lg:sticky lg:top-32 lg:w-[25%]">
        <div class="flex flex-row items-center justify-start space-x-4">
            <img class="size-14" src={data.clan.clanData?.badgeUrls.medium} alt={data.clan.clanData?.name} />
            <div class="flex flex-col items-start justify-center">
                <h1 class="font-heading text-lg font-semibold md:text-xl lg:text-2xl">{data.clan.clanData?.name}</h1>
                <p class="text-sm">{data.clan.clanData?.tag}</p>
            </div>
        </div>
        <div class="text-sm">
            <p>Clan LVL. {data.clan.clanData?.clanLevel}</p>
            <p>Capital LVL. {data.clan.clanData?.clanCapital.capitalHallLevel}</p>
        </div>
        <div class="w-full text-sm">
            <p>
                Leader:
                <span class="bg-gradient-to-r from-yellow-400 via-orange-600 to-orange-600 bg-clip-text text-transparent">
                    {members.leader[0].name}
                </span>
            </p>
            <button class="flex cursor-pointer items-center justify-between space-x-1" onclick={() => (showCoLeaders = !showCoLeaders)}>
                <p class="text-sm">Co-Leaders</p>
                <div class="rounded-md p-1 transition-all duration-300 ease-in-out hover:bg-gray-800">
                    {#if showCoLeaders}
                        <div in:fade>
                            <MaterialSymbolsArrowUpwardRounded class="size-4" />
                        </div>
                    {:else}
                        <div in:fade>
                            <MaterialSymbolsArrowDownwardRounded class="size-4" />
                        </div>
                    {/if}
                </div>
            </button>
            {#if showCoLeaders}
                <div transition:slide={{ duration: 200 }}>
                    <ul class="ml-6 list-disc">
                        {#each members.coLeader as member (member.tag)}
                            <li class="text-sm">{member.name}</li>
                        {/each}
                    </ul>
                </div>
            {/if}
        </div>

        <InlineLink
            href={`https://link.clashofclans.com/en?action=OpenClanProfile&tag=${data.tag}`}
            class="group flex items-center space-x-1 text-sm transition-all duration-300 ease-in-out"
            newTab={true}
        >
            <span>Open in Game</span>
            <PhArrowUpRightBold class="size-3 transition-transform group-hover:-translate-y-1 group-hover:translate-x-2" />
        </InlineLink>
    </div>

    <div
        class="w-full flex-1 border-t border-gray-700 pt-5 marker:text-orange-400 prose-a:text-indigo-400 prose-blockquote:not-italic prose-blockquote:text-green-400 lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0"
    >
        <article class="prose prose-invert w-full max-w-none">
            {#each Object.keys(sortedCommonComponentFiles) as componentFile}
                {@const SvelteComponent = sortedCommonComponentFiles[componentFile].default}
                <SvelteComponent />
            {/each}

            <data.content />
        </article>
    </div>
</div>
