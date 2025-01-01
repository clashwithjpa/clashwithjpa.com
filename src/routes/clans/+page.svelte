<script lang="ts">
    import type { PageData } from "./$types";
    import H1 from "$lib/components/H1.svelte";
    import InlineLink from "$lib/components/InlineLink.svelte";
    import CardBody from "$lib/components/3D/CardBody.svelte";
    import CardContainer from "$lib/components/3D/CardContainer.svelte";
    import CardItem from "$lib/components/3D/CardItem.svelte";
    import PhArrowUpRightBold from "~icons/ph/arrow-up-right-bold";

    let { data }: { data: PageData } = $props();
    let mouseEvents: boolean[] = $state(Array(data.clans.length).fill(false));
</script>

<svelte:head>
    <title>JPA | Clans</title>
</svelte:head>

<div class="flex size-full flex-col">
    <header class="top-0 w-full">
        <div class="z-10 h-full w-full overflow-hidden bg-cover bg-fixed bg-center" style="background-image: url('/clans_header.webp');">
            <div class="flex h-full items-center bg-gray-950/40">
                <div class="mt-32 flex flex-grow flex-col items-start space-y-10 px-5 pb-5 md:px-24 lg:px-32">
                    <H1 class="text-4xl lg:text-5xl">JPA Clans</H1>
                    <p class="max-w-2xl text-base font-medium md:text-lg">
                        With over {data.clans.length} clans we have a place for everyone.
                        <span>
                            Clans range from LVL{Math.min(...data.clans.map((clan) => clan.clanLevel ?? 0))} to LVL{Math.max(
                                ...data.clans.map((clan) => clan.clanLevel ?? 0)
                            )}.
                        </span>
                        Each having their own rules and requirements. Find the right clan for you today!
                    </p>
                    <InlineLink
                        href="https://discord.clashwithjpa.com/"
                        class="group mt-4 flex items-center space-x-1 font-semibold transition-all duration-300 ease-in-out"
                        newTab={true}
                    >
                        <span>Join our Discord</span>
                        <PhArrowUpRightBold class="size-4 transition-transform group-hover:-translate-y-1 group-hover:translate-x-2" />
                    </InlineLink>
                </div>
            </div>
        </div>
    </header>

    <div class="flex w-full flex-col items-center justify-center p-11">
        <div class="flex w-full flex-col items-center">
            <div class="flex w-full flex-wrap items-center justify-center gap-5 lg:gap-11">
                {#each data.clans as clan, idx}
                    <CardContainer bind:isMouseEntered={mouseEvents[idx]}>
                        <CardBody class="flex flex-col justify-between rounded-lg border border-gray-700">
                            <CardItem isMouseEntered={mouseEvents[idx]} translateZ="100" class="flex w-80 items-center space-x-4 p-4">
                                <img class="size-20" src={clan.clanData?.badgeUrls.medium} alt={clan.clanData?.name} />
                                <div class="flex flex-col items-start">
                                    <h2 class="text-xl">{clan.clanData?.name}</h2>
                                    <p class="text-xs">{clan.clanData?.tag}</p>
                                    <p class="text-xs">LVL. {clan.clanData?.clanLevel}</p>
                                </div>
                            </CardItem>
                            <CardItem
                                isMouseEntered={mouseEvents[idx]}
                                translateZ="100"
                                class="flex flex-col rounded-lg border-y border-gray-700 bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 p-4 text-sm"
                            >
                                <div class="flex flex-col items-start gap-2">
                                    <div class="flex items-center gap-1">
                                        <img class="size-8 min-w-8" src="/labels/international.webp" alt="Members" />
                                        <p>{clan.clanData?.members} Members</p>
                                    </div>
                                </div>
                                <div class="mt-4 flex flex-col items-start gap-2 transition">
                                    <InlineLink
                                        href={`/clans/${clan.clanData?.tag.replace("#", "")}`}
                                        class="group flex items-center space-x-1 text-xs transition-all duration-300 ease-in-out"
                                    >
                                        <span>Clan Rules</span>
                                        <PhArrowUpRightBold
                                            class="size-3 transition-transform group-hover:-translate-y-1 group-hover:translate-x-2"
                                        />
                                    </InlineLink>
                                    <InlineLink
                                        href={`https://link.clashofclans.com/en?action=OpenClanProfile&tag=${clan.clanData?.tag}`}
                                        class="group flex items-center space-x-1 text-xs transition-all duration-300 ease-in-out"
                                        newTab={true}
                                    >
                                        <span>Open in Game</span>
                                        <PhArrowUpRightBold
                                            class="size-3 transition-transform group-hover:-translate-y-1 group-hover:translate-x-2"
                                        />
                                    </InlineLink>
                                </div>
                            </CardItem>
                            <CardItem isMouseEntered={mouseEvents[idx]} translateZ="100" class="flex w-full flex-col">
                                <p class="p-4 text-center text-sm">Minimum Requirements</p>
                                <div
                                    class="flex w-full flex-col items-start space-y-2 rounded-lg border-t border-gray-700 bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 p-4"
                                >
                                    <div class="flex items-center">
                                        <img class="size-11" src={`/labels/attacks.webp`} alt="attacks" />
                                        <p class="ml-2">
                                            {clan.attacksRequirement} Attacks
                                        </p>
                                    </div>
                                    <div class="flex items-center">
                                        <img class="size-11" src={`/labels/donations.webp`} alt="donations" />
                                        <p class="ml-2">
                                            {clan.donationsRequirement} Donations
                                        </p>
                                    </div>
                                    <div class="flex items-center">
                                        <img class="size-11" src={`/labels/clangames.webp`} alt="clangames" />
                                        <p class="ml-2">
                                            {clan.clangamesRequirement} Clan Games Points
                                        </p>
                                    </div>
                                </div>
                            </CardItem>
                        </CardBody>
                    </CardContainer>
                {/each}
            </div>
        </div>
    </div>
</div>
