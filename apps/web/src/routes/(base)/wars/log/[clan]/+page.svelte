<script lang="ts">
    import { goto } from "$app/navigation";
    import { page } from "$app/state";
    import { PUBLIC_SERVER_URL } from "$env/static/public";
    import WarFeed from "$lib/components/coc/war-log/WarFeed.svelte";
    import WarHistory from "$lib/components/coc/war-log/WarHistory.svelte";
    import WarLineup from "$lib/components/coc/war-log/WarLineup.svelte";
    import {
        formatAgo,
        formatShortDate,
        isActive,
        missedAttacks,
        warLogHref,
        type WarDetail,
        type WarLogClan,
        type WarSummary,
    } from "$lib/components/coc/war-log/warLog";
    import WarMissed from "$lib/components/coc/war-log/WarMissed.svelte";
    import WarPlayers from "$lib/components/coc/war-log/WarPlayers.svelte";
    import WarScoreboard from "$lib/components/coc/war-log/WarScoreboard.svelte";
    import CocBand from "$lib/components/ui/coc/CocBand.svelte";
    import CocBtn from "$lib/components/ui/coc/CocBtn.svelte";
    import CocPanel from "$lib/components/ui/coc/CocPanel.svelte";
    import CocPopup from "$lib/components/ui/coc/CocPopup.svelte";
    import CocTabs from "$lib/components/ui/coc/CocTabs.svelte";
    import Icon from "$lib/components/ui/Icon.svelte";
    import Seo from "$lib/components/ui/Seo.svelte";
    import { toast } from "$lib/toast";
    import { cn } from "$lib/utils";
    import { getFWAClanPoints, getWarLogClans, getWarLogWar, getWarLogWars } from "@repo/clashofclans-client";
    import { onMount, tick, untrack } from "svelte";
    import type { PageProps } from "./$types";

    let { data }: PageProps = $props();

    const opts = { baseURL: PUBLIC_SERVER_URL };
    const PAGE_SIZE = 30;

    let clans = $state<WarLogClan[]>([]);
    let wars = $state<WarSummary[]>([]);
    let hasMore = $state(false);
    let loadingMore = $state(false);
    let status = $state<"loading" | "ready" | "missing" | "failed">("loading");

    let live = $state<WarDetail | null>(null);
    let liveStatus = $state<"connecting" | "live" | "offline">("connecting");
    let checkedAt = $state<string | null>(null);
    let fwaCall = $state<"win" | "lose" | null>(null);

    // A past war picked from the history. It lives in ?war= so Back returns to the latest war
    // and the link can be shared; without it the panel shows the latest war, kept live.
    const warParam = $derived(Number(page.url.searchParams.get("war")) || null);
    let selected = $state<WarDetail | null>(null);
    let selecting = $state<number | null>(null);
    // Only a click moves the page. Back/forward and opening a shared link leave the scroll alone.
    let scrollOnChange = false;
    let tab = $state<"feed" | "lineup" | "missed">("feed");
    let now = $state(Date.now());
    let warPanel = $state<HTMLElement | null>(null);

    const clan = $derived(clans.find((c) => c.tag === data.tag));
    const clanName = $derived(live?.clan.name ?? clan?.name ?? data.tag);
    // Score-only wars carry no lineup, so our own name and badge come from what the page already knows.
    // The latest war always comes from the live stream, even when a link names it.
    const picked = $derived(selected && selected.id !== live?.id ? selected : null);
    const shown = $derived.by(() => {
        const war = picked ?? live;
        if (!war || war.clan.name) return war;
        return { ...war, clan: { ...war.clan, name: clanName, badge: war.clan.badge ?? live?.clan.badge ?? clan?.badge ?? null } };
    });
    const enc = $derived(encodeURIComponent(data.tag));

    async function loadWars(reset: boolean) {
        const before = reset ? undefined : wars.at(-1)?.id;
        const res = await getWarLogWars(enc, { limit: PAGE_SIZE, before }, opts).catch(() => null);
        if (!res) {
            if (reset) status = "failed";
            return;
        }
        if (!res.success) {
            if (reset) status = "missing";
            return;
        }
        wars = reset ? res.data.wars : [...wars, ...res.data.wars];
        hasMore = res.data.hasMore;
        if (reset) status = "ready";
    }

    async function loadMore() {
        loadingMore = true;
        await loadWars(false);
        loadingMore = false;
    }

    // Keeps the matching history row in step with the live war, and pulls the list again
    // when a war appears that it doesn't hold yet.
    function syncHistory(war: WarDetail) {
        const i = wars.findIndex((w) => w.id === war.id);
        if (i === -1) return void loadWars(true);
        wars[i] = {
            ...wars[i],
            state: war.state,
            result: war.result,
            clanStars: war.clan.stars,
            clanDestruction: war.clan.destruction,
            clanAttacks: war.clan.attacks,
            opponentStars: war.opponent.stars,
            opponentDestruction: war.opponent.destruction,
            opponentAttacks: war.opponent.attacks,
            hasDetail: war.hasDetail,
        };
    }

    // Everything below is per clan; switching clans re-runs it without a full page load.
    $effect(() => {
        const tag = data.tag;
        status = "loading";
        wars = [];
        live = null;
        checkedAt = null;
        liveStatus = "connecting";
        void loadWars(true);

        const source = new EventSource(`${PUBLIC_SERVER_URL}/coc/war-log/${encodeURIComponent(tag)}/live`);
        source.addEventListener("war", (e) => {
            const payload = JSON.parse((e as MessageEvent).data) as { war: WarDetail | null; checkedAt: string | null };
            live = payload.war;
            checkedAt = payload.checkedAt;
            liveStatus = "live";
            if (payload.war && status === "ready") syncHistory(payload.war);
        });
        source.addEventListener("checked", (e) => {
            checkedAt = (JSON.parse((e as MessageEvent).data) as { checkedAt: string | null }).checkedAt;
        });
        source.onopen = () => (liveStatus = "live");
        source.onerror = () => (liveStatus = source.readyState === EventSource.CLOSED ? "offline" : "connecting");
        return () => source.close();
    });

    // FWA marks every matchup as a win or a loss for each side; only the live war's call is published.
    const liveOpponent = $derived(live && isActive(live.state) ? live.opponent.tag : null);
    $effect(() => {
        fwaCall = null;
        const opponent = liveOpponent;
        if (!opponent) return;
        let cancelled = false;
        getFWAClanPoints(enc, opts)
            .then((r) => {
                const m = r.success ? r.data.points?.matchup : null;
                if (!cancelled && m?.winner && m.opponent.tag.toUpperCase() === opponent.toUpperCase()) {
                    fwaCall = m.winner === "clan" ? "win" : "lose";
                }
            })
            .catch(() => {});
        return () => (cancelled = true);
    });

    $effect(() => {
        const id = warParam;
        const tag = data.tag;
        if (!id) {
            selected = null;
            selecting = null;
            void reveal();
            return;
        }
        if (untrack(() => selected?.id) === id) return;
        let cancelled = false;
        selecting = id;
        getWarLogWar(encodeURIComponent(tag), id, opts)
            .then((res) => {
                if (cancelled) return;
                if (res.success) {
                    selected = res.data.war;
                    void reveal();
                } else {
                    toast.error("That war isn't in this clan's log");
                    void openWar(null, true);
                }
            })
            .catch(() => !cancelled && toast.error("Couldn't load that war"))
            .finally(() => !cancelled && (selecting = null));
        return () => (cancelled = true);
    });

    function openWar(id: number | null, replace = false) {
        const url = new URL(page.url);
        if (id) url.searchParams.set("war", String(id));
        else url.searchParams.delete("war");
        scrollOnChange = !replace;
        return goto(url, { noScroll: true, keepFocus: true, replaceState: replace });
    }

    async function reveal() {
        if (!scrollOnChange) return;
        scrollOnChange = false;
        await tick();
        const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        warPanel?.scrollIntoView({ block: "start", behavior: reduce ? "auto" : "smooth" });
    }

    function select(w: WarSummary) {
        const target = w.id === live?.id ? null : w.id;
        // Already on screen: nothing to swap, so just bring the panel into view.
        if (target === warParam) {
            scrollOnChange = true;
            return void reveal();
        }
        void openWar(target);
    }

    onMount(() => {
        getWarLogClans(opts)
            .then((r) => r.success && (clans = r.data.clans))
            .catch(() => {});
        const tick = setInterval(() => (now = Date.now()), 1000);
        return () => clearInterval(tick);
    });

    const stats = $derived.by(() => {
        const done = wars.filter((w) => w.result).slice(0, 20);
        const wins = done.filter((w) => w.result === "win").length;
        const dash = status === "ready" && done.length ? null : "–";
        return [
            { icon: "labels/clan-war-league", label: `Last ${done.length || 20} wars`, value: dash ?? `${wins}W ${done.length - wins}L` },
            { icon: "trophy", label: "Win rate", value: dash ?? `${Math.round((wins / done.length) * 100)}%` },
            { icon: "star", label: "Avg stars", value: dash ?? (done.reduce((n, w) => n + w.clanStars, 0) / done.length).toFixed(1) },
            { icon: "labels/attacks", label: "Missed hits", value: dash ?? String(done.reduce((n, w) => n + missedAttacks(w), 0)) },
        ];
    });

    const missedLabel = $derived(shown && isActive(shown.state) ? "Yet to attack" : "Missed");
    const tabs = $derived([
        { key: "feed" as const, label: shown?.attacks.length ? `Feed · ${shown.attacks.length}` : "Feed" },
        { key: "lineup" as const, label: "Lineup" },
        { key: "missed" as const, label: missedLabel },
    ]);

    const panelLabel = $derived(picked ? `Past war · ${formatShortDate(picked.endTime)}` : live && isActive(live.state) ? "Live war" : "Latest war");
    // Player totals only move when a war finishes.
    const playersVersion = $derived(wars.find((w) => w.result)?.id.toString() ?? "");
</script>

<Seo
    title="{clan?.name ?? 'Clan'} War Log"
    description="Every attack of every war, live as it lands: hit feed, lineups, missed attacks, history and per-player war stats for a JPA clan."
/>

<div class="-mx-2 p-0! md:-mx-4 lg:-mx-8">
    <CocBand
        ribbon="War log"
        title={clanName}
        description="Every hit of every war as it lands, plus who still has attacks in hand, past results and how each player has fought over recent wars."
        {stats}
    />

    <section class="mx-auto flex max-w-7xl flex-col gap-12 px-4 pt-14 pb-24 md:px-6 md:pt-16 lg:px-8">
        <div class="flex flex-wrap items-center justify-between gap-3">
            <div class="flex flex-wrap items-center gap-2">
                <CocBtn variant="orange" size="xs" href="/wars">All wars</CocBtn>
                <CocPopup title="Switch clan" placement="bottom-start" maxWidth="w-72">
                    {#snippet trigger()}
                        <CocBtn variant="green" size="xs">Switch clan</CocBtn>
                    {/snippet}
                    <ul class="flex flex-col gap-1">
                        {#each clans as c (c.tag)}
                            <li>
                                <a
                                    href={warLogHref(c.tag)}
                                    aria-current={c.tag === data.tag ? "page" : undefined}
                                    class={cn(
                                        "flex items-center gap-2 rounded-lg px-2 py-1.5 font-coc text-sm text-parchment transition-colors duration-200 hover:bg-black/30 hover:text-white",
                                        c.tag === data.tag && "bg-black/30 text-white",
                                    )}
                                >
                                    {#if c.badge}
                                        <img src={c.badge} alt="" class="size-6 shrink-0 object-contain" />
                                    {:else}
                                        <span class="size-6 shrink-0 rounded-full bg-black/30"></span>
                                    {/if}
                                    <span class="truncate font-bold">{c.name ?? c.tag}</span>
                                    {#if c.war && isActive(c.war.state)}
                                        <span class="ml-auto shrink-0 text-xs text-[#ffcd6a]">{c.war.state === "inWar" ? "Battle" : "Prep"}</span>
                                    {/if}
                                </a>
                            </li>
                        {/each}
                    </ul>
                </CocPopup>
            </div>
            <span class="flex items-center gap-2 font-coc text-xs text-parchment/70" aria-live="polite">
                <span
                    class={cn(
                        "size-2 rounded-full",
                        liveStatus === "live" ? "bg-[#7fc427]" : liveStatus === "connecting" ? "bg-[#ffcd6a]" : "bg-[#c22a1a]",
                    )}
                ></span>
                {#if liveStatus === "live"}
                    Live{checkedAt ? ` · checked ${formatAgo(checkedAt, now)}` : ""}
                {:else if liveStatus === "connecting"}
                    Connecting
                {:else}
                    Live updates offline
                {/if}
            </span>
        </div>

        {#if status === "missing"}
            <CocPanel label="War log">
                <div class="flex flex-col items-center gap-3 py-12 text-center">
                    <Icon name="labels/attacks" class="size-14 opacity-60 grayscale" />
                    <p class="font-coc text-xl font-bold text-white text-outline">That clan isn't in the JPA family</p>
                    <p class="font-coc text-sm text-parchment/70">War logs are kept for family clans only. Pick one from War Details.</p>
                    <CocBtn variant="orange" size="sm" href="/wars">War Details</CocBtn>
                </div>
            </CocPanel>
        {:else}
            <div bind:this={warPanel} class="scroll-mt-28">
                <CocPanel label={panelLabel}>
                    {#if picked}
                        <div class="mb-5 flex flex-wrap items-center justify-between gap-2 rounded-xl px-3 py-2 coc-slot">
                            <p class="font-coc text-sm text-parchment">
                                Showing the <b class="text-white">{formatShortDate(picked.endTime)}</b> war against
                                <b class="text-white">{picked.opponent.name ?? "an unknown clan"}</b> from the history below.
                            </p>
                            <CocBtn variant="green" size="xs" onclick={() => openWar(null)}>Back to latest</CocBtn>
                        </div>
                    {/if}
                    {#if shown}
                        {#key shown.id}
                            <div class="flex animate-in flex-col gap-5 duration-300 fade-in motion-reduce:animate-none">
                                <WarScoreboard war={shown} {now} fwaCall={picked ? null : fwaCall} />
                                <CocTabs label="War view" options={tabs} bind:value={tab} class="w-full md:w-fit" />
                                {#if tab === "feed"}
                                    <WarFeed war={shown} {now} />
                                {:else if tab === "lineup"}
                                    <WarLineup war={shown} />
                                {:else}
                                    <WarMissed war={shown} {now} />
                                {/if}
                            </div>
                        {/key}
                    {:else if status === "loading" || liveStatus === "connecting"}
                        <div class="flex flex-col gap-3" aria-busy="true" aria-label="Loading war">
                            <div class="h-6 w-40 animate-pulse rounded-md coc-slot"></div>
                            <div class="grid grid-cols-[1fr_5rem_1fr] gap-3">
                                <div class="h-28 animate-pulse rounded-xl coc-slot"></div>
                                <div class="h-10 animate-pulse self-center rounded coc-slot"></div>
                                <div class="h-28 animate-pulse rounded-xl coc-slot"></div>
                            </div>
                            <div class="h-24 animate-pulse rounded-xl coc-slot"></div>
                        </div>
                    {:else}
                        <div class="flex flex-col items-center gap-2 py-12 text-center">
                            <Icon name="labels/attacks" class="size-14 opacity-60 grayscale" />
                            <p class="font-coc text-xl font-bold text-white text-outline">No wars recorded yet</p>
                            <p class="font-coc text-sm text-parchment/70">The tracker picks the next war up as soon as the search finds a match.</p>
                        </div>
                    {/if}
                </CocPanel>
            </div>

            <div class="grid grid-cols-1 gap-12 xl:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] xl:gap-8">
                <CocPanel label="History">
                    {#if status === "loading"}
                        <div class="flex flex-col gap-1.5" aria-busy="true">
                            {#each Array(8) as _, i (i)}
                                <div class="h-12 animate-pulse rounded-lg coc-slot"></div>
                            {/each}
                        </div>
                    {:else if status === "failed"}
                        <p class="rounded-xl p-6 text-center font-coc text-sm text-parchment/70 coc-slot">Couldn't load the war history.</p>
                    {:else if !wars.length}
                        <p class="rounded-xl p-6 text-center font-coc text-sm text-parchment/70 coc-slot">No wars on record yet.</p>
                    {:else}
                        <WarHistory
                            {wars}
                            selectedId={shown?.id ?? null}
                            loadingId={selecting}
                            {hasMore}
                            {loadingMore}
                            onselect={select}
                            onmore={loadMore}
                        />
                    {/if}
                </CocPanel>

                <CocPanel label="Players">
                    {#if status === "ready"}
                        <WarPlayers tag={data.tag} version={playersVersion} />
                    {/if}
                </CocPanel>
            </div>
        {/if}
    </section>
</div>
