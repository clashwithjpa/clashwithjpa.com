<script lang="ts">
    import Icon from "$lib/components/ui/Icon.svelte";
    import { cn } from "$lib/utils";
    import { formatShortDate, isActive, missedAttacks, RESULT_TEXT, STATE_LABEL, type WarSummary } from "./warLog";

    let {
        wars,
        selectedId,
        loadingId,
        hasMore,
        loadingMore,
        onselect,
        onmore,
    }: {
        wars: WarSummary[];
        selectedId: number | null;
        loadingId: number | null;
        hasMore: boolean;
        loadingMore: boolean;
        onselect: (war: WarSummary) => void;
        onmore: () => void;
    } = $props();

    const RESULT_BG: Record<string, string> = { win: "bg-[#58a221]", lose: "bg-[#c22a1a]", tie: "bg-stone-500" };
    // Row tints: a wash plus a matching inner edge, laid between the wood and the text.
    const TINT: Record<string, string> = {
        win: "bg-[#58a221]/20 shadow-[inset_0_0_0_1px_rgb(88_162_33/0.45)]",
        lose: "bg-[#c22a1a]/20 shadow-[inset_0_0_0_1px_rgb(194_42_26/0.45)]",
        tie: "bg-stone-400/10 shadow-[inset_0_0_0_1px_rgb(168_162_158/0.3)]",
        active: "bg-[#e68e2e]/20 shadow-[inset_0_0_0_1px_rgb(230_142_46/0.5)]",
    };
    const tint = (w: WarSummary) => TINT[w.result ?? (isActive(w.state) ? "active" : "")];
    const finished = $derived(wars.filter((w) => w.result));
</script>

<div class="flex flex-col gap-3">
    {#if finished.length}
        <div class="flex flex-wrap items-center gap-1" aria-label="Results, newest first">
            {#each finished.slice(0, 40) as w (w.id)}
                <span
                    class={cn("h-4 w-2.5 rounded-sm border border-black", RESULT_BG[w.result!])}
                    title="{w.result} vs {w.opponentName} · {formatShortDate(w.endTime)}"
                ></span>
            {/each}
            <span class="ml-1 font-coc text-xs text-parchment/60">newest first</span>
        </div>
    {/if}

    <p class="font-coc text-xs text-parchment/60">Pick a war to open its scoreboard, hits and lineup in the panel above.</p>

    <ul class="flex flex-col gap-1.5">
        {#each wars as w (w.id)}
            {@const missed = w.result ? missedAttacks(w) : null}
            {@const open = selectedId === w.id}
            <li>
                <button
                    type="button"
                    onclick={() => onselect(w)}
                    aria-current={open ? "true" : undefined}
                    aria-busy={loadingId === w.id}
                    title={open ? "Showing in the panel above" : "Open this war in the panel above"}
                    class={cn(
                        "relative isolate grid w-full cursor-pointer grid-cols-[3.25rem_minmax(0,1fr)_auto] items-center gap-2 rounded-lg px-2.5 py-1.5 text-left font-coc coc-slot transition-[filter] duration-200 hover:brightness-125",
                        open && "ring-2 ring-[#ffcd6a]",
                        loadingId === w.id && "cursor-wait",
                    )}
                >
                    {#if tint(w)}
                        <!-- Below the text (isolate + -z-10), so the colours keep their contrast. -->
                        <span class={cn("pointer-events-none absolute inset-0 -z-10 rounded-lg", tint(w))} aria-hidden="true"></span>
                    {/if}
                    <span class="flex flex-col text-[0.7rem] leading-tight">
                        <span class="text-parchment/60">{formatShortDate(w.endTime)}</span>
                        {#if w.result}
                            <b class={cn("text-outline", RESULT_TEXT[w.result])}
                                >{w.result === "win" ? "Win" : w.result === "lose" ? "Lose" : "Draw"}</b
                            >
                        {:else}
                            <b class="text-[#ffcd6a]">{isActive(w.state) ? "Live" : STATE_LABEL[w.state]}</b>
                        {/if}
                    </span>
                    <span class="flex min-w-0 items-center gap-2">
                        {#if w.opponentBadge}
                            <img src={w.opponentBadge} alt="" class="size-7 shrink-0 object-contain" loading="lazy" />
                        {/if}
                        <span class="flex min-w-0 flex-col">
                            <span class="flex min-w-0 items-center gap-1.5">
                                <span class="truncate text-sm font-bold text-white text-outline">{w.opponentName ?? "Unknown clan"}</span>
                                {#if loadingId === w.id || open}
                                    <span
                                        class="shrink-0 rounded border border-black/60 bg-[#ffcd6a] px-1.5 py-px text-[0.6rem] leading-tight font-bold text-[#3a1e0a]"
                                    >
                                        {loadingId === w.id ? "Opening..." : "Showing above"}
                                    </span>
                                {/if}
                            </span>
                            <span class="truncate text-[0.7rem] text-parchment/60">
                                {w.teamSize}v{w.teamSize}{missed !== null ? ` · ${missed} missed` : ""}{w.hasDetail ? "" : " · score only"}
                            </span>
                        </span>
                    </span>
                    <span class="flex flex-col items-end text-xs text-parchment/80 tabular-nums">
                        <span class="flex items-center gap-1 font-bold text-white">
                            {w.clanStars}<Icon name="star" class="size-3.5" />{w.opponentStars}
                        </span>
                        <span>{w.clanDestruction.toFixed(1)}% · {w.opponentDestruction.toFixed(1)}%</span>
                    </span>
                </button>
            </li>
        {/each}
    </ul>

    {#if hasMore}
        <button
            type="button"
            disabled={loadingMore}
            class="cursor-pointer self-center rounded-xl px-4 py-2 font-coc text-sm text-parchment coc-slot hover:text-white disabled:cursor-wait disabled:opacity-60"
            onclick={onmore}
        >
            {loadingMore ? "Loading..." : "Older wars"}
        </button>
    {/if}
</div>
