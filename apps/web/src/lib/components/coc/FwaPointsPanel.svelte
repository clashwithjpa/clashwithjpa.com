<script lang="ts">
    import Icon from "#lib/components/ui/Icon.svelte";
    import { cn } from "#lib/utils.js";
    import { PUBLIC_SERVER_URL } from "$app/env/public";
    import { getFWAClanPoints, type GetFWAClanPoints200 } from "@repo/clashofclans-client";
    import { onMount } from "svelte";

    type Points = NonNullable<GetFWAClanPoints200["data"]["points"]>;

    let { tag }: { tag: string } = $props();

    let points = $state<Points | null>(null);
    let status = $state<"loading" | "ready" | "missing" | "failed">("loading");

    const sourceUrl = $derived(`https://points.fwafarm.com/clan?tag=${encodeURIComponent(tag.replace(/^#/, ""))}`);

    onMount(async () => {
        try {
            const res = await getFWAClanPoints(encodeURIComponent(tag), { baseURL: PUBLIC_SERVER_URL });
            points = res.data.points;
            status = points ? "ready" : "missing";
        } catch {
            status = "failed";
        }
    });

    const stateLabel: Record<string, string> = { preparation: "Preparation", inWar: "Battle day", warEnded: "War ended", notInWar: "Not in war" };
    const starRows = ["3★", "2★", "1★", "0★"];
    const day = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
    const signed = (n: number) => (n > 0 ? `+${n}` : `${n}`);
</script>

{#snippet label(text: string)}
    <h4 class="font-coc text-xs font-bold tracking-[0.18em] text-parchment/70 uppercase">{text}</h4>
{/snippet}

<div class="flex flex-col gap-4 font-coc">
    {#if status === "loading"}
        <div class="grid grid-cols-2 gap-2" aria-busy="true" aria-label="Loading points">
            {#each Array(2) as _, i (i)}
                <div class="h-16 animate-pulse rounded-xl coc-slot"></div>
            {/each}
            <div class="col-span-2 h-24 animate-pulse rounded-xl coc-slot"></div>
            <div class="col-span-2 h-40 animate-pulse rounded-xl coc-slot"></div>
        </div>
    {:else if status === "missing" || status === "failed" || !points}
        <div class="flex flex-col items-center gap-2 rounded-xl p-6 text-center coc-slot">
            <Icon name="labels/attacks" class="size-10 opacity-60 grayscale" />
            <p class="text-base font-bold text-white text-outline">
                {status === "missing" ? "Not in the FWA points database" : "Couldn't reach FWA Points"}
            </p>
            <p class="text-sm text-parchment/70">
                {status === "missing" ? "This clan has no point record yet." : "Their site didn't answer. Try again in a moment."}
            </p>
        </div>
    {:else}
        <div class="grid grid-cols-2 gap-2">
            <div class="flex items-center gap-3 rounded-xl p-3 coc-slot">
                <Icon name="trophy" class="size-8" />
                <div class="flex flex-col">
                    <span class="text-2xl leading-none font-black text-white tabular-nums text-outline">{points.balance ?? "–"}</span>
                    <span class="text-[0.65rem] font-bold tracking-wider text-parchment/70 uppercase">Point balance</span>
                </div>
            </div>
            <div class="flex items-center gap-3 rounded-xl p-3 coc-slot">
                <Icon name="labels/clan-war-league" class="size-8" />
                <div class="flex flex-col">
                    <span
                        class={cn("text-2xl leading-none font-black text-outline", points.activeFwa === false ? "text-[#ff8a75]" : "text-[#b9f07a]")}
                    >
                        {points.activeFwa === null ? "–" : points.activeFwa ? "Yes" : "No"}
                    </span>
                    <span class="text-[0.65rem] font-bold tracking-wider text-parchment/70 uppercase">Active FWA</span>
                </div>
            </div>
        </div>

        {#if points.matchup}
            {@const m = points.matchup}
            <div class="flex flex-col gap-2">
                {@render label(`Win calculator${m.sync ? ` · Sync #${m.sync}` : ""}`)}
                <div class="flex flex-col gap-2 rounded-xl p-3 coc-slot">
                    <div class="flex items-center justify-between gap-2 text-sm">
                        <span class={cn("truncate font-bold text-outline", m.winner === "clan" ? "text-[#b9f07a]" : "text-white")}
                            >{points.clan.name}</span
                        >
                        <span class="shrink-0 text-xs text-parchment/60">vs</span>
                        <span class={cn("truncate text-right font-bold text-outline", m.winner === "opponent" ? "text-[#b9f07a]" : "text-white")}>
                            {m.opponent.name}
                        </span>
                    </div>
                    <p class="border-t border-black/30 pt-2 text-center text-sm text-parchment">
                        {#if m.winner}
                            <span class="font-bold text-white text-outline">{m.winner === "clan" ? points.clan.name : m.opponent.name}</span>
                            should win{m.reason ? ` by ${m.reason}` : ""}
                        {:else}
                            {m.notice ?? (m.reason ? `Decided by ${m.reason}` : "No verdict yet")}
                        {/if}
                    </p>
                </div>
            </div>
        {/if}

        {#if points.warState && points.stars.length === 2}
            <div class="flex flex-col gap-2">
                {@render label(`Last known war · ${stateLabel[points.warState] ?? points.warState}`)}
                <div class="grid grid-cols-[auto_1fr_1fr] gap-x-3 gap-y-1 rounded-xl p-3 text-sm coc-slot">
                    <span></span>
                    {#each points.stars as side (side.name)}
                        <span class="truncate text-right font-bold text-white text-outline">{side.name}</span>
                    {/each}
                    {#each starRows as row, i (row)}
                        <span class="text-[#ffcd6a]">{row}</span>
                        {#each points.stars as side (side.name)}
                            <span class="text-right text-white tabular-nums">{side.counts[i] ?? 0}</span>
                        {/each}
                    {/each}
                </div>
            </div>
        {/if}

        {#if points.history.length}
            <div class="flex flex-col gap-2">
                {@render label("Point history")}
                <ul class="flex flex-col overflow-hidden rounded-xl coc-slot">
                    {#each points.history as entry (entry.at)}
                        <li class="flex items-center gap-3 border-b border-black/25 px-3 py-2 text-sm last:border-b-0">
                            <span class="w-12 shrink-0 text-xs text-parchment/60">{day(entry.at)}</span>
                            <span class="min-w-0 flex-1 truncate text-parchment">
                                {#if entry.sync}
                                    Sync #{entry.sync}
                                    {#if entry.result}
                                        <span class={entry.result === "win" ? "text-[#b9f07a]" : "text-[#ff8a75]"}>· {entry.result}</span>
                                    {/if}
                                {:else}
                                    {entry.note ?? "Adjustment"}
                                {/if}
                            </span>
                            <span
                                class={cn(
                                    "shrink-0 font-bold tabular-nums text-outline",
                                    entry.points > 0 ? "text-[#b9f07a]" : entry.points < 0 ? "text-[#ff8a75]" : "text-white",
                                )}
                            >
                                {signed(entry.points)}
                            </span>
                        </li>
                    {/each}
                </ul>
            </div>
        {/if}
    {/if}

    <a
        href={points?.sourceUrl ?? sourceUrl}
        target="_blank"
        rel="noopener noreferrer"
        class="self-center text-xs text-parchment/60 underline-offset-2 transition-colors duration-200 hover:text-white hover:underline"
    >
        Data from FWA Points. Open full page
    </a>
</div>
