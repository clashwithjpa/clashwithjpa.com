<script lang="ts">
    import { categorizeByRole } from "$lib/coc/clan";
    import type { APIClan, APIClanMember } from "$lib/coc/types";
    import { fade, slide } from "svelte/transition";
    import MaterialSymbolsArrowDownwardRounded from "~icons/material-symbols/arrow-downward-rounded";
    import MaterialSymbolsArrowUpwardRounded from "~icons/material-symbols/arrow-upward-rounded";

    let {
        clan
    }: {
        clan: {
            clanTag: string;
            clanLevel: number | null;
            attacksRequirement: number;
            donationsRequirement: number;
            clangamesRequirement: number;
            clanData: APIClan | null;
        };
    } = $props();

    let showCoLeaders: boolean = $state(false);
    let members: {
        [key: string]: APIClanMember[];
    } = $state({});

    (async () => {
        members = categorizeByRole(clan.clanData?.memberList || []);
    })();
</script>

<div class="flex flex-col items-start space-y-4">
    <div class="flex flex-row items-center justify-start space-x-4">
        <img class="size-14" src={clan.clanData?.badgeUrls.medium} alt={clan.clanData?.name} />
        <div class="flex flex-col items-start justify-center">
            <h1 class="text-xl font-semibold md:text-2xl">{clan.clanData?.name}</h1>
            <p class="text-sm">{clan.clanData?.tag}</p>
        </div>
    </div>
    <div>
        <p>Clan LVL. {clan.clanData?.clanLevel}</p>
        <p>Capital LVL. {clan.clanData?.clanCapital.capitalHallLevel}</p>
    </div>
    <div class="w-full">
        <p>
            Leader:
            <span class="bg-linear-to-r from-yellow-400 via-orange-600 to-orange-600 bg-clip-text text-transparent">
                {members.leader[0].name}
            </span>
        </p>
        <button class="flex cursor-pointer items-center justify-between space-x-1" onclick={() => (showCoLeaders = !showCoLeaders)}>
            <p>Co-Leaders</p>
            <div class="rounded-lg p-1 transition-all">
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
</div>
