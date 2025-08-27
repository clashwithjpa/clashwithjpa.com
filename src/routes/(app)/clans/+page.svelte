<script lang="ts">
    import Card from "$lib/components/app/Card.svelte";
    import ClanInfo from "$lib/components/app/ClanInfo.svelte";
    import H1 from "$lib/components/app/H1.svelte";
    import InlineLink from "$lib/components/app/InlineLink.svelte";
    import P from "$lib/components/app/P.svelte";
    import * as Popover from "$lib/components/ui/popover";
    import type { PageData } from "./$types";

    let { data }: { data: PageData } = $props();
    let mouseEvents: boolean[] = $state(Array(data.clans.length).fill(false));

    const cardGradient: string = "from-red-900 via-red-900 via-10% to-red-950 inset-shadow-rose-800";
</script>

<svelte:head>
    <title>JPA | Clans</title>
</svelte:head>

<div class="flex size-full flex-col">
    <header class="top-0 w-full">
        <div class="z-10 h-full w-full overflow-hidden bg-cover bg-fixed bg-center" style="background-image: url('/clans_header.webp');">
            <div class="bg-background/40 flex h-full items-center">
                <div class="mt-32 flex grow flex-col items-start space-y-10 px-5 pb-5 md:px-24 lg:px-32">
                    <H1 class="text-5xl lg:text-6xl">JPA Clans</H1>
                    <p class="max-w-2xl text-lg font-medium md:text-xl">
                        With over {data.clans.length} clans we have a place for everyone.
                        <span>
                            Clans range from LVL. {Math.min(...data.clans.map((clan) => clan.clanLevel ?? 0))} to LVL. {Math.max(
                                ...data.clans.map((clan) => clan.clanLevel ?? 0)
                            )}.
                        </span>
                        Each having their own rules and requirements. Find the right clan for you today!
                    </p>
                    <InlineLink href="https://discord.clashwithjpa.com/" class="mt-4 text-xl" arrow={true} newTab={true}>
                        <span>Join our Discord</span>
                    </InlineLink>
                    <div class="flex gap-4">
                        <InlineLink href="/wars" class="text-xl" arrow={true}>
                            <span>View Wars</span>
                        </InlineLink>
                    </div>
                </div>
            </div>
        </div>
    </header>

    <div class="flex w-full flex-col items-center justify-center p-11">
        <div class="flex w-full flex-col items-center">
            <div class="flex w-full flex-wrap items-stretch justify-center gap-5 lg:gap-11">
                {#each data.clans as clan, idx}
                    <Card
                        class="border-background relative size-full items-stretch rounded-xl border-2 bg-linear-to-b {cardGradient} shadow-background shadow-[0_0_5px_0.5px_var(--tw-shadow-color)] inset-shadow-sm"
                        bind:isMouseEntered={mouseEvents[idx]}
                    >
                        <img src="/cards_bg.webp" alt="Card Background" class="absolute inset-0 -z-10 size-full rounded-xl object-cover opacity-10" />
                        <div class="flex flex-col justify-between">
                            <div class="flex w-80 items-center space-x-4 p-4">
                                <img class="size-20" src={clan.clanData?.badgeUrls.medium} alt={clan.clanData?.name} />
                                <div class="flex size-full flex-col items-start">
                                    <P class="text-2xl">
                                        {clan.clanData?.name}
                                    </P>
                                    <p class="text-sm">{clan.clanData?.tag}</p>
                                    <p class="text-sm">LVL. {clan.clanData?.clanLevel}</p>
                                </div>
                            </div>
                            <div
                                class="border-background bg-foreground/10 inset-shadow-foreground mx-2 flex flex-col rounded-xl border-1 p-4 inset-shadow-sm"
                            >
                                <div class="flex flex-col items-start gap-2">
                                    <div class="flex items-center gap-1">
                                        <img class="size-8 min-w-8" src="/labels/international.webp" alt="Members" />
                                        <p>{clan.clanData?.members} Members</p>
                                    </div>
                                </div>
                                <div class="mt-4 flex flex-col items-start gap-2 transition">
                                    <Popover.Root>
                                        <Popover.Trigger class="flex items-center space-x-1 transition-all duration-300 ease-in-out">
                                            <InlineLink class="text-sm">Clan Info</InlineLink>
                                        </Popover.Trigger>
                                        <Popover.Content
                                            class="border-background flex flex-col rounded-xl border-1 bg-linear-to-b {cardGradient} shadow-background p-4 shadow-[0_0_5px_0.1px_var(--tw-shadow-color)] inset-shadow-sm"
                                        >
                                            <ClanInfo {clan} />
                                        </Popover.Content>
                                    </Popover.Root>
                                    <InlineLink
                                        href={`https://link.clashofclans.com/en?action=OpenClanProfile&tag=${clan.clanData?.tag}`}
                                        arrow={true}
                                        newTab={true}
                                    >
                                        <span>Open in Game</span>
                                    </InlineLink>
                                </div>
                            </div>
                            <div class="mx-2 mb-2 flex flex-col">
                                <p class="p-4 text-center">Minimum Requirements</p>
                                <div
                                    class="border-background bg-foreground/10 inset-shadow-foreground flex w-full flex-col items-start space-y-2 rounded-xl border-1 p-4 inset-shadow-sm"
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
                            </div>
                        </div>
                    </Card>
                {/each}
            </div>
        </div>
    </div>
</div>
