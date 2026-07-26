<script lang="ts">
    import { PUBLIC_SERVER_URL } from "$env/static/public";
    import FamilyChart, { type FamilyClan } from "$lib/components/coc/FamilyChart.svelte";
    import StatCard from "$lib/components/coc/StatCard.svelte";
    import Badge from "$lib/components/ui/Badge.svelte";
    import CocBtn from "$lib/components/ui/coc/CocBtn.svelte";
    import CocCard from "$lib/components/ui/coc/CocCard.svelte";
    import Icon from "$lib/components/ui/Icon.svelte";
    import type { GetCOCClan200 } from "@repo/clashofclans-client";
    import { getCOCClan } from "@repo/clashofclans-client";
    import { onMount } from "svelte";

    type Clan = GetCOCClan200["data"]["clan"];

    let { clanTags = [] }: { clanTags?: string[] } = $props();

    let clans = $state<Clan[]>([]);
    let loading = $state(true);
    let failed = $state(false);

    onMount(async () => {
        if (clanTags.length === 0) {
            loading = false;
            failed = true;
            return;
        }

        const results = await Promise.allSettled(clanTags.map((tag) => getCOCClan(encodeURIComponent(tag), { baseURL: PUBLIC_SERVER_URL })));

        const loaded: Clan[] = [];
        for (const r of results) {
            if (r.status === "fulfilled" && r.value.success && r.value.data?.clan) {
                loaded.push(r.value.data.clan);
            }
        }

        clans = loaded.sort((a, b) => b.clanLevel - a.clanLevel);
        loading = false;
        failed = loaded.length === 0;
    });

    const totals = $derived.by(() => {
        return clans.reduce(
            (acc, c) => {
                acc.members += c.members;
                acc.warWins += c.warWins;
                acc.trophies += c.clanPoints;
                acc.capital += c.clanCapitalPoints ?? 0;
                return acc;
            },
            { members: 0, warWins: 0, trophies: 0, capital: 0 },
        );
    });

    const thDistribution = $derived.by(() => {
        const dist: Record<number, number> = {};
        for (const c of clans) {
            for (const m of c.memberList ?? []) {
                dist[m.townHallLevel] = (dist[m.townHallLevel] ?? 0) + 1;
            }
        }
        return dist;
    });

    const chartClans = $derived<FamilyClan[]>(
        clans.map((c) => ({ name: c.name, warWins: c.warWins, members: c.members, points: c.clanPoints, level: c.clanLevel })),
    );

    const formatNumber = (n: number) => new Intl.NumberFormat("en-US").format(n);
</script>

<div class="flex flex-col gap-10">
    <!-- Live aggregate stats -->
    <div class="flex flex-wrap justify-center gap-3 md:gap-4">
        <StatCard
            value={clanTags.length || null}
            label="Clans in the family"
            icon="labels/clanwarleague"
            {loading}
            delay={0}
            class="w-[calc(50%-0.375rem)] md:w-[calc(33.333%-0.667rem)]"
        />
        <StatCard
            value={loading ? null : totals.members}
            label="Warriors mustered"
            icon="labels/international"
            {loading}
            delay={100}
            class="w-[calc(50%-0.375rem)] md:w-[calc(33.333%-0.667rem)]"
        />
        <StatCard
            value={loading ? null : totals.warWins}
            label="Wars won"
            icon="star"
            {loading}
            delay={200}
            class="w-[calc(50%-0.375rem)] md:w-[calc(33.333%-0.667rem)]"
        />
        <StatCard
            value={loading ? null : totals.trophies}
            label="Combined trophies"
            icon="trophy"
            {loading}
            delay={300}
            class="w-[calc(50%-0.375rem)] md:w-[calc(33.333%-0.667rem)]"
        />
        <StatCard
            value={loading ? null : totals.capital}
            label="Capital loot"
            icon="labels/clancapital"
            {loading}
            delay={400}
            class="w-full md:w-[calc(33.333%-0.667rem)]"
        />
    </div>

    <!-- Interactive charts -->
    <FamilyChart clans={chartClans} {thDistribution} {loading} />

    <!-- Clan muster -->
    <div class="flex flex-col gap-5">
        <div class="flex items-end justify-between gap-4">
            <div>
                <h3 class="font-coc text-xl font-black text-[#ffdf9b] md:text-2xl">The Muster</h3>
                <p class="font-coc text-xs text-stone-400 md:text-sm">Every clan flying the JPA banner right now</p>
            </div>
            <CocBtn href="/clans" variant="orange" size="sm" class="shrink-0">All clans</CocBtn>
        </div>

        {#if loading}
            <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {#each Array(6) as _}
                    <div class="h-23 animate-pulse rounded-2xl border border-black/60 bg-[#2a1810]/60"></div>
                {/each}
            </div>
        {:else if failed}
            <div class="rounded-2xl border border-black/60 bg-[#2a1810]/60 p-8 text-center">
                <p class="font-coc text-lg font-bold text-red-400">The scouts couldn't reach the clans</p>
                <p class="font-coc text-sm text-stone-400">Live clan data is offline. Try again in a moment.</p>
            </div>
        {:else}
            <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {#each clans as clan, i (clan.tag)}
                    <a
                        href="https://link.clashofclans.com/?action=OpenClanProfile&tag={encodeURIComponent(clan.tag)}"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="stagger-up block origin-center transform transition-all duration-200 hover:scale-[1.02]"
                        style="--i:{i}"
                    >
                        <CocCard variant="dark" contentClass="flex items-center gap-3 p-3">
                            <div
                                class="size-14 shrink-0 bg-contain bg-center bg-no-repeat drop-shadow-[0_2px_3px_rgba(0,0,0,0.6)]"
                                style="background-image: url('{clan.badgeUrls.large}');"
                            ></div>
                            <div class="flex min-w-0 flex-1 flex-col gap-1">
                                <div class="flex items-center gap-2">
                                    <span class="truncate font-coc text-base font-black text-stone-900">{clan.name}</span>
                                    <Badge variant="yellow" content={`Lvl ${clan.clanLevel}`} class="shrink-0 font-bold" />
                                </div>
                                <div class="flex items-center gap-3 font-coc text-xs text-stone-700">
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
    </div>
</div>
