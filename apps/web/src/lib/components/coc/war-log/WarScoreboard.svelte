<script lang="ts">
    import CocMeter from "$lib/components/ui/coc/CocMeter.svelte";
    import Icon from "$lib/components/ui/Icon.svelte";
    import { cn } from "$lib/utils";
    import Momentum from "./Momentum.svelte";
    import { formatCountdown, formatDateTime, isActive, pct, RESULT_LABEL, RESULT_TEXT, STATE_LABEL, type Side, type WarDetail } from "./warLog";

    let { war, now, fwaCall = null }: { war: WarDetail; now: number; fwaCall?: "win" | "lose" | null } = $props();

    const chip: Record<string, string> = {
        inWar: "from-[#f2604a] to-[#a51f14]",
        preparation: "from-[#ffcd6a] to-[#d97a1e]",
        warEnded: "from-[#a8a29e] to-[#57534e]",
    };

    const totalAttacks = $derived(war.teamSize * war.attacksPerMember);
    const countdown = $derived.by(() => {
        if (!isActive(war.state)) return null;
        const target = war.state === "preparation" ? war.startTime : war.endTime;
        return target ? formatCountdown(Date.parse(target) - now) : null;
    });

    // The war's TH spread per side, highest first.
    const spread = (side: Side) => {
        const counts = new Map<number, number>();
        for (const m of war[side].members) counts.set(m.th, (counts.get(m.th) ?? 0) + 1);
        return [...counts].sort((a, b) => b[0] - a[0]);
    };

    const stats = $derived.by(() => {
        const of = (side: Side) => {
            const hits = war.attacks.filter((a) => a.side === side);
            const fresh = hits.filter((a) => a.fresh);
            const triples = hits.filter((a) => a.stars === 3).length;
            const avg = (list: typeof hits, f: (a: (typeof hits)[number]) => number) =>
                list.length ? list.reduce((n, a) => n + f(a), 0) / list.length : 0;
            return {
                triples,
                avgStars: avg(hits, (a) => a.stars),
                avgDestruction: avg(hits, (a) => a.destruction),
                freshTripleRate: fresh.length ? (fresh.filter((a) => a.stars === 3).length / fresh.length) * 100 : 0,
                avgDuration: avg(hits, (a) => a.duration),
                mirrorRate: hits.length ? (hits.filter((a) => a.attackerPos === a.defenderPos).length / hits.length) * 100 : 0,
            };
        };
        const a = of("clan");
        const b = of("opponent");
        return [
            { label: "Triples", a: String(a.triples), b: String(b.triples) },
            { label: "Avg stars / hit", a: a.avgStars.toFixed(2), b: b.avgStars.toFixed(2) },
            { label: "Avg destruction", a: pct(a.avgDestruction), b: pct(b.avgDestruction) },
            { label: "Fresh 3★ rate", a: pct(a.freshTripleRate, 0), b: pct(b.freshTripleRate, 0) },
            { label: "Mirror hits", a: pct(a.mirrorRate, 0), b: pct(b.mirrorRate, 0) },
            { label: "Avg hit time", a: `${Math.round(a.avgDuration)}s`, b: `${Math.round(b.avgDuration)}s` },
        ];
    });
</script>

{#snippet side(s: Side)}
    {@const info = war[s]}
    <div class="flex min-w-0 flex-col items-center gap-1 rounded-xl p-2 text-center coc-slot">
        {#if info.badge}
            <img src={info.badge} alt="" class="size-12 object-contain drop-shadow-[0_3px_3px_rgba(0,0,0,0.6)] md:size-14" />
        {:else}
            <div class="size-12 rounded-full bg-black/25 md:size-14"></div>
        {/if}
        <span class="w-full truncate font-coc text-sm font-bold text-white text-outline md:text-base">{info.name ?? "Unknown"}</span>
        {#if info.members.length}
            <span class="flex flex-wrap justify-center gap-x-1.5 font-coc text-[0.65rem] text-parchment/70">
                {#each spread(s).slice(0, 4) as [th, n] (th)}
                    <span>TH{th}×{n}</span>
                {/each}
            </span>
        {/if}
    </div>
{/snippet}

<div class="flex flex-col gap-3">
    <div class="flex flex-wrap items-center justify-between gap-2">
        <div class="flex flex-wrap items-center gap-2">
            <span
                class={cn(
                    "rounded-md border border-black bg-linear-to-b px-2.5 py-0.5 font-coc text-xs font-bold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.35)] text-outline",
                    chip[war.state] ?? chip.warEnded,
                )}
            >
                {STATE_LABEL[war.state] ?? war.state}
            </span>
            {#if war.battleModifier && war.battleModifier !== "none"}
                <span class="rounded-md px-2 py-0.5 font-coc text-xs text-parchment coc-slot">Hard mode</span>
            {/if}
            {#if fwaCall}
                <span
                    class="rounded-md px-2 py-0.5 font-coc text-xs coc-slot"
                    title="The result FWA has marked for this matchup on points.fwafarm.com"
                >
                    FWA call: <b class={RESULT_TEXT[fwaCall]}>{fwaCall === "win" ? "Win" : "Lose"}</b>
                </span>
            {/if}
        </div>
        {#if countdown}
            <span class="flex items-center gap-1.5 font-coc text-sm font-bold text-white text-outline">
                <Icon name="clock" class="size-5" />
                <span class="text-parchment/80 [text-shadow:none]">{war.state === "preparation" ? "Starts in" : "Ends in"}</span>
                <span class="tabular-nums">{countdown}</span>
            </span>
        {:else if war.result}
            <span class="font-coc text-sm font-bold text-outline {RESULT_TEXT[war.result]}">
                {RESULT_LABEL[war.result]} · <span class="font-normal text-parchment/70 [text-shadow:none]">{formatDateTime(war.endTime)}</span>
            </span>
        {/if}
    </div>

    <div class="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 md:gap-3">
        {@render side("clan")}
        <div class="flex flex-col items-center gap-1 px-1">
            <div class="flex items-center gap-1.5">
                <span class="font-coc text-3xl font-black text-white tabular-nums text-outline md:text-4xl">{war.clan.stars}</span>
                <Icon name="star" class="size-7 md:size-8" />
                <span class="font-coc text-3xl font-black text-white tabular-nums text-outline md:text-4xl">{war.opponent.stars}</span>
            </div>
            <span class="font-coc text-xs font-bold tracking-[0.2em] text-parchment/70 uppercase">{war.teamSize} vs {war.teamSize}</span>
        </div>
        {@render side("opponent")}
    </div>

    <div class="grid grid-cols-2 gap-2">
        <CocMeter label="{war.clan.name} destruction" value={war.clan.destruction} max={100} text={pct(war.clan.destruction, 2)} />
        <CocMeter
            label="{war.opponent.name} destruction"
            value={war.opponent.destruction}
            max={100}
            tone="blurple"
            text={pct(war.opponent.destruction, 2)}
        />
        <CocMeter
            label="{war.clan.name} attacks used"
            value={war.clan.attacks}
            max={totalAttacks}
            tone="orange"
            text="{war.clan.attacks}/{totalAttacks} hits"
            class={war.hasDetail ? "" : "col-span-2"}
        />
        <!-- The public war log summary only counts our own hits. -->
        {#if war.hasDetail}
            <CocMeter
                label="{war.opponent.name} attacks used"
                value={war.opponent.attacks}
                max={totalAttacks}
                tone="orange"
                text="{war.opponent.attacks}/{totalAttacks} hits"
            />
        {/if}
    </div>

    {#if war.hasDetail && war.attacks.length}
        <dl class="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] gap-x-3 gap-y-0.5 rounded-xl px-3 py-2 font-coc text-sm coc-slot">
            {#each stats as row (row.label)}
                <dd class="text-right font-bold text-white tabular-nums">{row.a}</dd>
                <dt class="text-center text-xs text-parchment/60">{row.label}</dt>
                <dd class="font-bold text-white tabular-nums">{row.b}</dd>
            {/each}
        </dl>
        <Momentum {war} {now} />
    {/if}
</div>
