<script lang="ts">
    import WarCard, { parseCoCDate, type WarEntry } from "#lib/components/coc/WarCard.svelte";
    import CocBand from "#lib/components/ui/coc/CocBand.svelte";
    import CocPanel from "#lib/components/ui/coc/CocPanel.svelte";
    import CocTabs from "#lib/components/ui/coc/CocTabs.svelte";
    import Icon from "#lib/components/ui/Icon.svelte";
    import Seo from "#lib/components/ui/Seo.svelte";
    import { PUBLIC_SERVER_URL } from "$app/env/public";
    import { page } from "$app/state";
    import { getCOCClan, getCOCClanCurrentWar } from "@repo/clashofclans-client";
    import { onMount } from "svelte";
    import type { PageProps } from "./$types";

    type Filter = "all" | "inWar" | "preparation" | "ended";

    let { data }: PageProps = $props();

    const tags = $derived(data.clans?.success ? Object.keys(data.clans.data.clans) : []);

    let entries = $state<WarEntry[]>([]);
    let loading = $state(true);
    let filter = $state<Filter>("all");
    let now = $state(Date.now());

    async function load(tag: string): Promise<WarEntry | null> {
        const opts = { baseURL: PUBLIC_SERVER_URL };
        const encoded = encodeURIComponent(tag);
        const war = await getCOCClanCurrentWar(encoded, opts)
            .then((r) => (r.success ? r.data.currentWar : null))
            .catch(() => null);
        if (war?.clan?.name) return { tag, name: war.clan.name, badge: war.clan.badgeUrls.large, war };

        // Outside a war the response carries no clan details, so the name and badge come from the clan itself.
        const clan = await getCOCClan(encoded, opts)
            .then((r) => (r.success ? r.data.clan : null))
            .catch(() => null);
        return clan ? { tag, name: clan.name, badge: clan.badgeUrls.large, war } : null;
    }

    onMount(() => {
        Promise.all(tags.map(load)).then((loaded) => {
            entries = loaded.filter((e) => e !== null);
            loading = false;
        });
        const tick = setInterval(() => (now = Date.now()), 1000);
        return () => clearInterval(tick);
    });

    const stateOf = (e: WarEntry) => e.war?.state ?? "notInWar";
    const order = { inWar: 0, preparation: 1, warEnded: 2, notInWar: 3 } as const;
    const deadline = (e: WarEntry) => {
        if (!e.war) return Infinity;
        return parseCoCDate(e.war.state === "preparation" ? e.war.startTime : e.war.endTime);
    };

    const filters: { key: Filter; label: string; match: (e: WarEntry) => boolean }[] = [
        { key: "all", label: "All", match: () => true },
        { key: "inWar", label: "Battle day", match: (e) => stateOf(e) === "inWar" },
        { key: "preparation", label: "Prep", match: (e) => stateOf(e) === "preparation" },
        { key: "ended", label: "Ended", match: (e) => stateOf(e) === "warEnded" || stateOf(e) === "notInWar" },
    ];

    const shown = $derived(
        entries
            .filter(filters.find((f) => f.key === filter)!.match)
            .sort((a, b) => order[stateOf(a)] - order[stateOf(b)] || deadline(a) - deadline(b)),
    );
    const missing = $derived(loading ? 0 : tags.length - entries.length);

    const stats = $derived.by(() => {
        const count = (s: string) => (loading ? "–" : String(entries.filter((e) => stateOf(e) === s).length));
        const attacksLeft = entries.reduce(
            (n, { war }) => (war?.state === "inWar" ? n + war.teamSize * (war.attacksPerMember ?? 0) - war.clan.attacks : n),
            0,
        );
        return [
            { icon: "labels/clan-war-league", label: "Clans", value: tags.length ? String(tags.length) : "–" },
            { icon: "labels/attacks", label: "Battle day", value: count("inWar") },
            { icon: "clock", label: "Preparation", value: count("preparation") },
            { icon: "labels/friendly-wars", label: "Attacks left", value: loading ? "–" : new Intl.NumberFormat("en-US").format(attacksLeft) },
        ];
    });
</script>

<Seo
    title="War Details"
    description="Follow every JPA war as it happens: scores, destruction, attacks left and battle day countdowns, plus each clan's FWA point balance and win calculator."
    buttons={[{ label: "See live wars", url: `${page.url.origin}/wars`, emoji: "⚔️" }]}
/>

<div class="-mx-2 p-0! md:-mx-4 lg:-mx-8">
    <CocBand
        ribbon="War room"
        title="JPA Wars"
        description="Every war across the family as it happens. Scores, destruction, attacks still in hand and how long until the battle day ends."
        {stats}
    />

    <section class="mx-auto max-w-7xl px-4 pt-16 pb-24 md:px-6 md:pt-20 lg:px-8">
        <CocPanel label="Current wars">
            <CocTabs label="Filter wars" options={filters} bind:value={filter} class="mb-5 w-full md:w-fit" />

            {#if loading}
                <div class="grid grid-cols-1 gap-5 lg:grid-cols-2" aria-busy="true" aria-label="Loading wars">
                    {#each Array(Math.min(tags.length || 4, 6)) as _, i (i)}
                        <div class="flex h-64 flex-col gap-3 rounded-2xl p-4 coc-plank">
                            <div class="h-5 w-28 animate-pulse rounded bg-black/20"></div>
                            <div class="grid flex-1 grid-cols-[1fr_5rem_1fr] gap-3">
                                <div class="animate-pulse rounded-xl bg-black/25"></div>
                                <div class="animate-pulse self-center rounded bg-black/20 py-5"></div>
                                <div class="animate-pulse rounded-xl bg-black/25"></div>
                            </div>
                            <div class="h-7 animate-pulse rounded-lg bg-black/25"></div>
                        </div>
                    {/each}
                </div>
            {:else if !entries.length}
                <div class="flex flex-col items-center gap-3 py-16 text-center">
                    <Icon name="labels/attacks" class="size-14 opacity-60 grayscale" />
                    <p class="font-coc text-xl font-bold text-white text-outline">The scouts couldn't reach the war map</p>
                    <p class="font-coc text-sm text-stone-400">Live war data is offline. Try again in a moment.</p>
                </div>
            {:else if !shown.length}
                <div class="flex flex-col items-center gap-2 py-16 text-center">
                    <p class="font-coc text-xl font-bold text-white text-outline">Nothing here right now</p>
                    <p class="font-coc text-sm text-stone-400">No clan is in that stage of war at the moment.</p>
                </div>
            {:else}
                <div class="grid grid-cols-1 gap-5 lg:grid-cols-2">
                    {#each shown as entry (entry.tag)}
                        <WarCard {entry} {now} />
                    {/each}
                </div>
            {/if}

            {#if missing > 0 && entries.length}
                <p class="mt-5 text-center font-coc text-xs text-stone-500">
                    {missing === 1 ? "1 clan" : `${missing} clans`} couldn't be scouted right now.
                </p>
            {/if}
        </CocPanel>
    </section>
</div>
