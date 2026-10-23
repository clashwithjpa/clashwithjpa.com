<script lang="ts">
    import { page } from "$app/state";
    import { PUBLIC_SERVER_URL } from "$env/static/public";
    import ClanRoster from "$lib/components/coc/ClanRoster.svelte";
    import FamilyChart, { type FamilyClan } from "$lib/components/coc/FamilyChart.svelte";
    import CocBtn from "$lib/components/ui/coc/CocBtn.svelte";
    import CocCard from "$lib/components/ui/coc/CocCard.svelte";
    import H1 from "$lib/components/ui/coc/H1.svelte";
    import Icon from "$lib/components/ui/Icon.svelte";
    import Seo from "$lib/components/ui/Seo.svelte";
    import { LINKS } from "$lib/utils/links";
    import { getCOCClan, type GetCOCClan200 } from "@repo/clashofclans-client";
    import { onMount } from "svelte";
    import SimpleIconsDiscord from "~icons/simple-icons/discord";
    import type { PageProps } from "./$types";

    type Clan = GetCOCClan200["data"]["clan"];

    let { data }: PageProps = $props();

    let clans = $state<Clan[]>([]);
    let loading = $state(true);
    let failed = $state(false);

    onMount(async () => {
        if (data.clanTags.length === 0) {
            loading = false;
            failed = true;
            return;
        }
        const results = await Promise.allSettled(data.clanTags.map((tag) => getCOCClan(encodeURIComponent(tag), { baseURL: PUBLIC_SERVER_URL })));
        const loaded: Clan[] = [];
        for (const r of results) {
            if (r.status === "fulfilled" && r.value.success && r.value.data?.clan) loaded.push(r.value.data.clan);
        }
        clans = loaded.sort((a, b) => b.clanLevel - a.clanLevel);
        loading = false;
        failed = loaded.length === 0;
    });

    const totals = $derived(
        clans.reduce((acc, c) => ({ members: acc.members + c.members, warWins: acc.warWins + c.warWins, trophies: acc.trophies + c.clanPoints }), {
            members: 0,
            warWins: 0,
            trophies: 0,
        }),
    );
    const thDistribution = $derived.by(() => {
        const dist: Record<number, number> = {};
        for (const c of clans) for (const m of c.memberList ?? []) dist[m.townHallLevel] = (dist[m.townHallLevel] ?? 0) + 1;
        return dist;
    });
    const chartClans = $derived<FamilyClan[]>(
        clans.map((c) => ({ name: c.name, warWins: c.warWins, members: c.members, points: c.clanPoints, level: c.clanLevel })),
    );

    // Six-digit totals don't fit a half-width cell on phones, so they go compact (1.2M).
    const fmt = (n: number) => new Intl.NumberFormat("en-US", n >= 100_000 ? { notation: "compact", maximumFractionDigits: 1 } : {}).format(n);
    const live = $derived([
        { icon: "labels/clan-war-league", label: "Clans", value: data.clanTags.length ? fmt(data.clanTags.length) : "–" },
        { icon: "labels/international", label: "Members", value: loading || failed ? "–" : fmt(totals.members) },
        { icon: "star", label: "Wars won", value: loading || failed ? "–" : fmt(totals.warWins) },
        { icon: "trophy", label: "Trophies", value: loading || failed ? "–" : fmt(totals.trophies) },
    ]);

    const features = [
        {
            art: "barbarian-king",
            title: "Guaranteed wars",
            body: "Synchronized 50v50 FWA wars back-to-back. There's always a base waiting for your attacks.",
        },
        {
            art: "archer-queen",
            title: "CWL every season",
            body: "Clans spread across the leagues, with a Clan War League roster for every town hall level.",
        },
        {
            art: "gold-storage",
            title: "Loot, not drama",
            body: "War-farming keeps storages full and builders busy. No forced pushes, no rushed-base shaming.",
        },
        {
            art: "grand-warden",
            title: "A real community",
            body: "An active Discord, hands-on leaders, and players clashing from every corner of the map.",
        },
    ];
</script>

<Seo
    description="Clash With JPA is a family of Farm War Alliance clans running synchronized 50v50 FWA wars and Clan War League every season. Find the clan with a seat for your town hall."
    buttons={[{ label: "Explore the clans", url: `${page.url.origin}/clans`, emoji: "🛡️" }]}
/>

{#snippet heading(eyebrow: string, title: string, sub?: string)}
    <div class="flex flex-col items-center gap-3 text-center">
        <span class="font-coc text-xs font-bold tracking-[0.3em] text-[#ffcd6a] uppercase">{eyebrow}</span>
        <h2 class="font-coc text-3xl font-black text-stone-100 md:text-5xl">{title}</h2>
        {#if sub}
            <p class="max-w-2xl font-coc text-sm text-stone-400 md:text-base">{sub}</p>
        {/if}
    </div>
{/snippet}

<div class="-mx-2 p-0! md:-mx-4 lg:-mx-8">
    <!-- Pulled up under the transparent navbar so the art runs to the top edge. -->
    <section class="relative -mt-20 flex min-h-dvh flex-col justify-center overflow-hidden pt-20">
        <img src="/bg.webp" alt="" class="hero-art absolute inset-0 -z-20 size-full object-cover object-[65%_center]" />
        <div class="absolute inset-0 -z-10 bg-linear-to-r from-stone-950/95 via-stone-950/60 to-stone-950/10"></div>
        <div class="absolute inset-x-0 bottom-0 -z-10 h-48 bg-linear-to-b from-transparent to-stone-950"></div>

        <div class="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-16 md:px-6 lg:px-8">
            <div class="hero-rise" style="--i:0">
                <H1 class="max-w-3xl text-5xl leading-[1.05] md:text-7xl lg:text-8xl">Clash With JPA</H1>
            </div>
            <p class="hero-rise max-w-xl font-coc text-base text-stone-200 md:text-xl" style="--i:1">
                War-farming done right. Synchronized 50v50 FWA wars, CWL every season and a family of clans with a seat for your town hall.
            </p>
            <div class="hero-rise flex flex-wrap items-center gap-3 pt-2 md:gap-4" style="--i:2">
                <CocBtn variant="orange" href="/dashboard/apply">Apply now</CocBtn>
                <CocBtn variant="blurple" href={LINKS.discord} target="_blank"><SimpleIconsDiscord /> Join Discord</CocBtn>
                <span class="hidden sm:contents">
                    <CocBtn variant="green" href="/clans">Explore clans</CocBtn>
                </span>
            </div>

            <dl
                class="hero-rise mt-6 grid max-w-3xl grid-cols-2 gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10 backdrop-blur-sm md:mt-10 md:grid-cols-4"
                style="--i:3"
            >
                {#each live as stat (stat.label)}
                    <div class="flex items-center gap-3 bg-stone-950/60 px-4 py-3">
                        <Icon name={stat.icon} class="size-9 drop-shadow-[0_2px_2px_rgba(0,0,0,0.6)]" />
                        <div class="flex min-w-0 flex-col">
                            {#key stat.value}
                                <dd
                                    class="animate-in truncate font-coc text-xl leading-tight font-black text-stone-50 tabular-nums duration-500 fade-in"
                                >
                                    {stat.value}
                                </dd>
                            {/key}
                            <dt class="font-coc text-[0.65rem] font-bold tracking-wider text-stone-400 uppercase">{stat.label}</dt>
                        </div>
                    </div>
                {/each}
            </dl>
        </div>
    </section>

    <section class="bg-stone-950 pb-24">
        <div class="mx-auto flex max-w-7xl flex-col gap-24 px-4 md:px-6 lg:px-8">
            <div class="flex flex-col gap-6">
                {@render heading("Why fight with us", "Built for war-farmers")}
                <div class="grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-2 lg:grid-cols-4">
                    {#each features as feature (feature.title)}
                        <div class="relative flex flex-col pt-28">
                            <img
                                src="/art/{feature.art}.webp"
                                alt=""
                                class="pointer-events-none absolute top-0 left-1/2 z-10 size-48 -translate-x-1/2 object-contain drop-shadow-[0_12px_16px_rgba(0,0,0,0.55)] select-none"
                            />
                            <CocCard class="h-full" contentClass="flex flex-col gap-2 px-5 pt-24 pb-6 text-center">
                                <h3 class="font-coc text-xl font-black text-white text-outline">{feature.title}</h3>
                                <p class="font-coc text-sm leading-relaxed text-parchment/85">{feature.body}</p>
                            </CocCard>
                        </div>
                    {/each}
                </div>
            </div>

            <div class="flex flex-col gap-8">
                <div class="flex flex-col items-center gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <div class="flex flex-col items-center gap-3 text-center sm:items-start sm:text-left">
                        <span class="font-coc text-xs font-bold tracking-[0.3em] text-[#ffcd6a] uppercase">The muster</span>
                        <h2 class="font-coc text-3xl font-black text-stone-100 md:text-5xl">Every clan in the family</h2>
                    </div>
                    <CocBtn href="/clans" variant="orange" size="sm" class="shrink-0">All clans</CocBtn>
                </div>
                <ClanRoster {clans} {loading} {failed} />
                <FamilyChart clans={chartClans} {thDistribution} {loading} />
            </div>

            <CocCard class="mx-auto w-full max-w-5xl" contentClass="grid items-center gap-6 p-6 md:grid-cols-[1fr_minmax(0,18rem)] md:gap-10 md:p-10">
                <div class="flex flex-col items-center gap-5 text-center md:items-start md:text-left">
                    <h2 class="font-coc text-3xl font-black text-white text-outline md:text-5xl">Ready to march?</h2>
                    <p class="max-w-xl font-coc text-sm text-parchment/85 md:text-base">
                        Link your account and we'll slot you into the clan that fits your town hall. Wars start the day you're accepted.
                    </p>
                    <div class="flex flex-wrap items-center justify-center gap-3 md:justify-start">
                        <CocBtn variant="orange" href="/dashboard/apply">Apply now</CocBtn>
                        <CocBtn variant="blurple" href={LINKS.discord} target="_blank"><SimpleIconsDiscord /> Join Discord</CocBtn>
                    </div>
                </div>
                <!-- The sign's blank area, measured on the source art, carries the text. -->
                <div class="@container relative mx-auto w-48 md:w-full" aria-hidden="true">
                    <img src="/art/barbarian-sign.webp" alt="" class="w-full select-none" />
                    <span
                        class="absolute top-[52.7%] left-[20%] grid h-[42.3%] w-[62%] place-items-center text-center font-coc text-[15cqw] leading-none font-black text-[#3b2416]"
                    >
                        JOIN<br />JPA
                    </span>
                </div>
            </CocCard>
        </div>
    </section>
</div>
