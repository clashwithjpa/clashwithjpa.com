<script lang="ts">
    import Badge from "#lib/components/ui/Badge.svelte";
    import CocCard from "#lib/components/ui/coc/CocCard.svelte";
    import Icon from "#lib/components/ui/Icon.svelte";
    import type { GetCOCClanStatus200 } from "@repo/clashofclans-client";

    type Clan = GetCOCClanStatus200["data"]["clan"];

    let { clans, loading, failed }: { clans: Clan[]; loading: boolean; failed: boolean } = $props();

    const formatNumber = (n: number) => new Intl.NumberFormat("en-US").format(n);
</script>

{#if loading}
    <!-- Same plank as a loaded clan, so the grid fills in rather than swapping styles. -->
    <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true" aria-label="Loading clans">
        {#each Array(6) as _, i (i)}
            <CocCard contentClass="flex items-center gap-3 p-3">
                <div class="size-14 shrink-0 animate-pulse rounded-xl bg-black/25"></div>
                <div class="flex flex-1 flex-col gap-2">
                    <div class="h-4 w-32 animate-pulse rounded-md bg-black/25"></div>
                    <div class="h-3 w-44 max-w-full animate-pulse rounded-md bg-black/20"></div>
                </div>
            </CocCard>
        {/each}
    </div>
{:else if failed}
    <CocCard contentClass="flex flex-col items-center gap-2 p-8 text-center">
        <Icon name="labels/attacks" class="size-12 opacity-60 grayscale" />
        <p class="font-coc text-lg font-bold text-[#ff8a75] text-outline">The scouts couldn't reach the clans</p>
        <p class="font-coc text-sm text-parchment/70">Live clan data is offline. Try again in a moment.</p>
    </CocCard>
{:else}
    <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {#each clans as clan (clan.tag)}
            <a
                href="https://link.clashofclans.com/?action=OpenClanProfile&tag={encodeURIComponent(clan.tag)}"
                target="_blank"
                rel="noopener noreferrer"
                class="block h-full transition-[filter] duration-200 hover:brightness-110"
            >
                <CocCard class="h-full" contentClass="flex items-center gap-3 p-3">
                    <img src={clan.badgeUrls.large} alt="" class="size-14 shrink-0 object-contain drop-shadow-[0_2px_3px_rgba(0,0,0,0.6)]" />
                    <div class="flex min-w-0 flex-1 flex-col gap-1">
                        <div class="flex items-center gap-2">
                            <span class="truncate font-coc text-base font-black text-white text-outline">{clan.name}</span>
                            <Badge variant="yellow" content={`Lvl ${clan.clanLevel}`} class="shrink-0 font-bold" />
                        </div>
                        <div class="flex items-center gap-3 font-coc text-xs text-parchment/70">
                            <span class="flex items-center gap-1"><Icon name="labels/international" class="size-4" />{clan.members}/50</span>
                            <span class="flex items-center gap-1"><Icon name="star" class="size-4" />{formatNumber(clan.warWins)}</span>
                            <span class="flex items-center gap-1"><Icon name="trophy" class="size-4" />{formatNumber(clan.clanPoints)}</span>
                        </div>
                    </div>
                </CocCard>
            </a>
        {/each}
    </div>
{/if}
