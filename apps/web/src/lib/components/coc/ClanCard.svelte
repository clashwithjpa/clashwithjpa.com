<script lang="ts">
    import CocBtn from "#lib/components/ui/coc/CocBtn.svelte";
    import CocMeter from "#lib/components/ui/coc/CocMeter.svelte";
    import CocPopup from "#lib/components/ui/coc/CocPopup.svelte";
    import Icon from "#lib/components/ui/Icon.svelte";
    import TownHall from "#lib/components/ui/TownHall.svelte";
    import { cn } from "#lib/utils.js";
    import type { GetCOCClan200, GetJPAClanRequirements200 } from "@repo/clashofclans-client";

    type Clan = GetCOCClan200["data"]["clan"];

    let {
        clan,
        requirements,
        class: className = "",
    }: {
        clan: Clan;
        requirements: GetJPAClanRequirements200["data"]["clans"][string];
        class?: string;
    } = $props();

    const MAX_MEMBERS = 50;
    const joinType: Record<Clan["type"], string> = { open: "Anyone can join", inviteOnly: "Invite only", closed: "Closed" };

    let tagCopied = $state(false);

    const leader = $derived(clan.memberList?.find((m) => m.role === "leader"));
    const coLeaders = $derived(clan.memberList?.filter((m) => m.role === "coLeader") ?? []);
    const full = $derived(clan.members >= MAX_MEMBERS);
    const minimums = $derived(
        [
            { icon: "labels/attacks", label: "Attacks", value: requirements.requiredAttacks },
            { icon: "labels/donations", label: "Donations", value: requirements.requiredDonations },
            { icon: "labels/clan-games", label: "Clan Games", value: requirements.requiredClangames },
        ].filter((m) => m.value !== null),
    );

    const formatNumber = (num: number) => new Intl.NumberFormat("en-US").format(num);

    const copyTag = async () => {
        try {
            await navigator.clipboard.writeText(clan.tag);
            tagCopied = true;
            setTimeout(() => (tagCopied = false), 2000);
        } catch (err) {
            console.error("Failed to copy tag:", err);
        }
    };
</script>

{#snippet stat(icon: string, label: string, value: string | number)}
    <div class="flex items-center gap-2 rounded-lg p-3 coc-slot">
        <Icon name={icon} class="size-12" />
        <div class="flex flex-col">
            <span class="font-coc text-xs font-bold text-parchment/70">{label}</span>
            <span class="font-coc text-base font-black text-white">{value}</span>
        </div>
    </div>
{/snippet}

<article class={cn("relative flex flex-col gap-3 rounded-2xl p-3 coc-plank transition-[filter] duration-200 hover:brightness-105 md:p-4", className)}>
    <!-- Chips sit beside the badge slot from sm up, and drop under it on phones where they'd wrap one per line. -->
    <div class="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-2">
        <div class="col-start-1 row-start-1 flex min-w-0 flex-col gap-1.5">
            <span class="font-coc text-[0.65rem] font-bold tracking-[0.18em] text-parchment/75 uppercase md:text-xs">
                Level {clan.clanLevel} · {joinType[clan.type] ?? clan.type}
            </span>
            <h3 class="truncate font-coc text-xl leading-tight font-black text-white text-outline md:text-2xl">{clan.name}</h3>
            <div class="flex items-center gap-2">
                <button
                    type="button"
                    class={cn(
                        "cursor-copy font-coc text-xs transition-colors duration-200",
                        tagCopied ? "text-[#b9f07a]" : "text-parchment/80 hover:text-white",
                    )}
                    onclick={copyTag}
                >
                    {tagCopied ? "Copied!" : clan.tag}
                </button>
                {#each clan.labels ?? [] as label (label.id)}
                    <img src={label.iconUrls.small} alt={label.name} title={label.name} class="size-5 drop-shadow-[0_1px_1px_rgba(0,0,0,0.6)]" />
                {/each}
            </div>
        </div>

        <div class="col-span-2 row-start-2 flex flex-wrap content-end gap-1.5 sm:col-span-1">
            {#if clan.requiredTownhallLevel}
                <span class="flex items-center gap-1.5 rounded-lg py-1 pr-2.5 pl-1.5 coc-slot" title="Minimum town hall">
                    <TownHall level={clan.requiredTownhallLevel} class="size-6" />
                    <span class="font-coc text-sm font-bold text-white text-outline">TH{clan.requiredTownhallLevel}+</span>
                </span>
            {/if}
            {#each minimums as min (min.label)}
                <span class="flex items-center gap-1.5 rounded-lg py-1 pr-2.5 pl-1.5 coc-slot" title="Minimum {min.label.toLowerCase()}">
                    <Icon name={min.icon} class="size-6" />
                    <span class="flex flex-col leading-none">
                        <span class="font-coc text-sm font-bold text-white text-outline">{min.value}</span>
                        <span class="font-coc text-[0.6rem] text-parchment/70">{min.label}</span>
                    </span>
                </span>
            {/each}
        </div>

        <div
            class="relative col-start-2 row-start-1 flex w-24 flex-col items-center justify-center gap-1 rounded-xl p-2 coc-slot sm:row-span-2 md:w-28"
        >
            <img src={clan.badgeUrls.large} alt="" class="size-16 object-contain drop-shadow-[0_3px_3px_rgba(0,0,0,0.6)] md:size-20" />
            <span class="flex items-center gap-1 font-coc text-sm font-bold text-white text-outline" title="Clan trophies">
                <Icon name="trophy" class="size-4" />
                {formatNumber(clan.clanPoints)}
            </span>
        </div>
    </div>

    <div class="flex flex-col gap-2 sm:flex-row sm:items-center">
        <CocMeter
            class="flex-1"
            label="Members"
            value={clan.members}
            max={MAX_MEMBERS}
            tone={full ? "orange" : "green"}
            text={full ? "Clan full" : `${clan.members}/${MAX_MEMBERS} members`}
        />

        <div class="grid grid-cols-2 gap-2 sm:flex">
            <CocPopup title="{clan.name}'s Info" placement="right" class="w-full">
                {#snippet trigger()}
                    <CocBtn variant="orange" size="sm" class="w-full">Details</CocBtn>
                {/snippet}
                <div class="flex flex-col gap-4">
                    {#if clan.description}
                        <div class="rounded-lg p-3 coc-slot">
                            <p class="font-coc text-sm leading-relaxed text-white">{clan.description}</p>
                        </div>
                    {/if}

                    <div class="flex flex-col gap-2">
                        <h4 class="mb-2 font-coc text-sm font-bold text-parchment/80 uppercase">Clan Statistics</h4>
                        <div class="grid grid-cols-2 gap-2">
                            {@render stat("labels/international", "Members", `${clan.members}/${MAX_MEMBERS}`)}
                            {@render stat("labels/trophy-pushing", "Trophies", formatNumber(clan.clanPoints))}
                            {@render stat("labels/clan-capital", "War Wins", clan.warWins)}
                            {@render stat("labels/relaxed", "Win Streak", clan.warWinStreak)}
                        </div>
                        {#if clan.warLeague}
                            <div class="flex items-center justify-between gap-2 rounded-lg p-3 coc-slot">
                                <div class="flex items-center gap-1">
                                    <Icon name="labels/clan-war-league" class="size-8" />
                                    <span class="font-coc text-sm font-bold text-parchment/70">War League</span>
                                </div>
                                <span class="font-coc text-sm font-black text-white">{clan.warLeague.name}</span>
                            </div>
                        {/if}
                    </div>

                    {#if leader || coLeaders.length > 0}
                        <div>
                            <h4 class="mb-2 font-coc text-sm font-bold text-parchment/80 uppercase">Leadership</h4>
                            <div class="flex flex-col gap-2">
                                {#if leader}
                                    <div class="flex items-center justify-between gap-2 rounded-lg p-3 coc-slot">
                                        <div class="flex items-center gap-1">
                                            <Icon name="labels/trophy-pushing" class="size-8" />
                                            <span class="font-coc text-sm font-bold text-parchment/70">Leader</span>
                                        </div>
                                        <span class="font-coc text-sm font-black text-white">{leader.name}</span>
                                    </div>
                                {/if}
                                {#if coLeaders.length > 0}
                                    <div class="flex flex-col gap-2 rounded-lg p-3 coc-slot">
                                        <div class="flex items-center gap-1">
                                            <Icon name="labels/competitive" class="size-8" />
                                            <span class="font-coc text-sm font-bold text-parchment/70">Co-Leaders</span>
                                            <span class="font-coc text-xs font-bold text-parchment/70">({coLeaders.length})</span>
                                        </div>
                                        <div class="flex flex-wrap gap-1.5">
                                            {#each coLeaders as cl (cl.tag)}
                                                <span class="rounded px-2 py-1 font-coc text-xs font-bold text-white coc-slot">
                                                    {cl.name}
                                                </span>
                                            {/each}
                                        </div>
                                    </div>
                                {/if}
                            </div>
                        </div>
                    {/if}
                </div>
            </CocPopup>

            <CocBtn
                variant="green"
                size="sm"
                class="w-full"
                href="https://link.clashofclans.com/?action=OpenClanProfile&tag={encodeURIComponent(clan.tag)}"
                target="_blank"
            >
                Open
            </CocBtn>
        </div>
    </div>
</article>
