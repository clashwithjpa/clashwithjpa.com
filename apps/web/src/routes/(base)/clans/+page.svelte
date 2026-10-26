<script lang="ts">
    import ClanCard from "#lib/components/coc/ClanCard.svelte";
    import CocBand from "#lib/components/ui/coc/CocBand.svelte";
    import CocBtn from "#lib/components/ui/coc/CocBtn.svelte";
    import CocInput from "#lib/components/ui/coc/CocInput.svelte";
    import CocPanel from "#lib/components/ui/coc/CocPanel.svelte";
    import CocTabs from "#lib/components/ui/coc/CocTabs.svelte";
    import Icon from "#lib/components/ui/Icon.svelte";
    import Seo from "#lib/components/ui/Seo.svelte";
    import { page } from "$app/state";
    import { getCOCClan, type GetCOCClanStatus200 } from "@repo/clashofclans-client";
    import { onMount } from "svelte";
    import TablerSearch from "~icons/tabler/search";
    import type { PageProps } from "./$types";

    type Clan = GetCOCClanStatus200["data"]["clan"];
    type SortKey = "level" | "trophies" | "space";

    let { data }: PageProps = $props();

    const requirements = $derived(data.clans?.data ? data.clans.data.data.clans : {});
    const tags = $derived(Object.keys(requirements));

    let clans = $state<Clan[]>([]);
    let loading = $state(true);
    let query = $state("");
    let sort = $state<SortKey>("level");

    onMount(async () => {
        const results = await Promise.allSettled(tags.map((tag) => getCOCClan({ path: { tag } })));
        clans = results.flatMap((r) => (r.status === "fulfilled" && r.value.data && r.value.data?.data.clan ? [r.value.data.data.clan] : []));
        loading = false;
    });

    const sorts: { key: SortKey; label: string; by: (c: Clan) => number }[] = [
        { key: "level", label: "Level", by: (c) => c.clanLevel * 1e6 + c.clanPoints },
        { key: "trophies", label: "Trophies", by: (c) => c.clanPoints },
        { key: "space", label: "Open spots", by: (c) => 50 - c.members },
    ];

    const shown = $derived.by(() => {
        const q = query.trim().toLowerCase();
        const by = sorts.find((s) => s.key === sort)!.by;
        return clans.filter((c) => !q || c.name.toLowerCase().includes(q) || c.tag.toLowerCase().includes(q)).sort((a, b) => by(b) - by(a));
    });
    const missing = $derived(loading ? 0 : tags.length - clans.length);

    const fmt = (n: number) => new Intl.NumberFormat("en-US", n >= 100_000 ? { notation: "compact", maximumFractionDigits: 1 } : {}).format(n);
    const stats = $derived.by(() => {
        const sum = (f: (c: Clan) => number) => (loading || !clans.length ? "–" : fmt(clans.reduce((n, c) => n + f(c), 0)));
        return [
            { icon: "labels/clan-war-league", label: "Clans", value: tags.length ? fmt(tags.length) : "–" },
            { icon: "labels/international", label: "Members", value: sum((c) => c.members) },
            { icon: "labels/newbie-friendly", label: "Open spots", value: sum((c) => Math.max(50 - c.members, 0)) },
            { icon: "star", label: "Wars won", value: sum((c) => c.warWins) },
        ];
    });
</script>

<Seo
    title="Clans"
    description="Every JPA clan in one place: level, trophies, open spots and the town hall, attack and donation minimums each one asks for. Pick the clan that fits and apply."
    buttons={[{ label: "Browse the clans", url: `${page.url.origin}/clans`, emoji: "🛡️" }]}
/>

<div class="-mx-2 p-0! md:-mx-4 lg:-mx-8">
    <CocBand
        ribbon="The family"
        title="JPA Clans"
        description="Every clan in the family runs the same FWA wars and the same rules. Pick the one with room for you, then apply."
        {stats}
    />

    <section class="mx-auto max-w-7xl px-4 pt-16 pb-24 md:px-6 md:pt-20 lg:px-8">
        <CocPanel label="Clan search">
            <div class="mb-5 flex flex-col gap-3 md:flex-row md:items-center">
                <CocInput type="search" label="Search clans" placeholder="Search by name or tag" bind:value={query} class="md:flex-1">
                    {#snippet icon()}
                        <TablerSearch class="size-5" />
                    {/snippet}
                </CocInput>
                <CocTabs label="Sort clans" options={sorts} bind:value={sort} />
            </div>

            {#if loading}
                <div class="grid grid-cols-1 gap-5 lg:grid-cols-2" aria-busy="true" aria-label="Loading clans">
                    {#each Array(Math.min(tags.length || 4, 6)) as _, i (i)}
                        <div class="flex h-48 gap-3 rounded-2xl p-4 coc-plank">
                            <div class="flex flex-1 flex-col gap-2">
                                <div class="h-3 w-28 animate-pulse rounded bg-black/20"></div>
                                <div class="h-6 w-44 max-w-full animate-pulse rounded bg-black/25"></div>
                                <div class="mt-auto h-7 w-full animate-pulse rounded-lg bg-black/25"></div>
                            </div>
                            <div class="w-24 animate-pulse rounded-xl bg-black/25 md:w-28"></div>
                        </div>
                    {/each}
                </div>
            {:else if !clans.length}
                <div class="flex flex-col items-center gap-3 py-16 text-center">
                    <Icon name="labels/attacks" class="size-14 opacity-60 grayscale" />
                    <p class="font-coc text-xl font-bold text-white text-outline">The scouts couldn't reach the clans</p>
                    <p class="font-coc text-sm text-stone-400">Live clan data is offline. Try again in a moment.</p>
                </div>
            {:else if !shown.length}
                <div class="flex flex-col items-center gap-3 py-16 text-center">
                    <p class="font-coc text-xl font-bold text-white text-outline">No clan goes by "{query.trim()}"</p>
                    <CocBtn variant="orange" size="sm" onclick={() => (query = "")}>Clear search</CocBtn>
                </div>
            {:else}
                <div class="grid grid-cols-1 gap-5 lg:grid-cols-2">
                    {#each shown as clan (clan.tag)}
                        <ClanCard {clan} requirements={requirements[clan.tag]} />
                    {/each}
                </div>
            {/if}

            {#if missing > 0 && clans.length}
                <p class="mt-5 text-center font-coc text-xs text-stone-500">
                    {missing === 1 ? "1 clan" : `${missing} clans`} couldn't be scouted right now.
                </p>
            {/if}
        </CocPanel>
    </section>
</div>
