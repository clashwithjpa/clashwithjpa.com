<script lang="ts">
    import CocInput from "$lib/components/ui/coc/CocInput.svelte";
    import CocTabs from "$lib/components/ui/coc/CocTabs.svelte";
    import TownHall from "$lib/components/ui/TownHall.svelte";
    import { cn } from "$lib/utils";
    import TablerArrowRight from "~icons/tabler/arrow-right";
    import TablerSearch from "~icons/tabler/search";
    import TablerSortAscending from "~icons/tabler/sort-ascending";
    import TablerSortDescending from "~icons/tabler/sort-descending";
    import Stars from "./Stars.svelte";
    import { formatAgo, formatClock, formatDateTime, SIDE_COLOR, type WarAttack, type WarDetail } from "./warLog";

    let { war, now }: { war: WarDetail; now: number } = $props();

    type SideFilter = "all" | "clan" | "opponent";
    type Kind = "all" | "triple" | "zero" | "offMirror";

    const PAGE = 60;
    let side = $state<SideFilter>("all");
    let kind = $state<Kind>("all");
    let search = $state("");
    let newestFirst = $state(true);
    let limit = $state(PAGE);

    const names = $derived(new Map([...war.clan.members, ...war.opponent.members].map((m) => [m.tag, m.name])));

    // FWA asks for every first hit on the mirror base, so a first hit elsewhere is worth calling out.
    const offMirror = (a: WarAttack) => a.side === "clan" && a.attackNo === 1 && a.attackerPos !== a.defenderPos;

    const kinds: { key: Kind; label: string; match: (a: WarAttack) => boolean }[] = [
        { key: "all", label: "All", match: () => true },
        { key: "triple", label: "3★", match: (a) => a.stars === 3 },
        { key: "zero", label: "0★", match: (a) => a.stars === 0 },
        { key: "offMirror", label: "Off mirror", match: offMirror },
    ];

    const filtered = $derived.by(() => {
        const q = search.trim().toLowerCase();
        const match = kinds.find((k) => k.key === kind)!.match;
        const list = war.attacks.filter(
            (a) =>
                (side === "all" || a.side === side) &&
                match(a) &&
                (!q || names.get(a.attackerTag)?.toLowerCase().includes(q) || names.get(a.defenderTag)?.toLowerCase().includes(q)),
        );
        return newestFirst ? list.reverse() : list;
    });

    $effect(() => {
        void side;
        void kind;
        void search;
        limit = PAGE;
    });

    const sideOptions = $derived([
        { key: "all" as const, label: "Both" },
        { key: "clan" as const, label: war.clan.name ?? "Us" },
        { key: "opponent" as const, label: war.opponent.name ?? "Them" },
    ]);
</script>

<div class="flex flex-col gap-3">
    {#if war.hasDetail}
        <div class="flex flex-col gap-2 md:flex-row md:flex-wrap md:items-center">
            <CocTabs label="Attacking side" options={sideOptions} bind:value={side} class="w-full md:w-fit [&>*]:max-w-40 [&>*]:truncate" />
            <CocTabs label="Hit type" options={kinds} bind:value={kind} class="w-full md:w-fit" />
            <div class="flex flex-1 items-center gap-2">
                <CocInput type="search" label="Search players" placeholder="Search players" bind:value={search} class="min-w-0 flex-1">
                    {#snippet icon()}<TablerSearch class="size-4" />{/snippet}
                </CocInput>
                <button
                    type="button"
                    class="grid size-10 shrink-0 cursor-pointer place-items-center rounded-xl border-2 border-black text-parchment/80 coc-slot transition-colors duration-200 hover:text-white"
                    aria-label={newestFirst ? "Showing newest first" : "Showing oldest first"}
                    title={newestFirst ? "Newest first" : "Oldest first"}
                    onclick={() => (newestFirst = !newestFirst)}
                >
                    {#if newestFirst}<TablerSortDescending class="size-5" />{:else}<TablerSortAscending class="size-5" />{/if}
                </button>
            </div>
        </div>
    {/if}

    {#if !war.hasDetail}
        <p class="rounded-xl p-6 text-center font-coc text-sm text-parchment/70 coc-slot">
            Only the final score of this war is known. It ended before the tracker or ClashKing recorded its attacks.
        </p>
    {:else if !filtered.length}
        <p class="rounded-xl p-6 text-center font-coc text-sm text-parchment/70 coc-slot">
            {war.attacks.length ? "No hits match these filters." : "No hits yet. The feed fills in as attacks land."}
        </p>
    {:else}
        <ol class="flex flex-col gap-1.5">
            {#each filtered.slice(0, limit) as a (a.order)}
                {@const thDiff = a.defenderTh - a.attackerTh}
                <li
                    class="grid grid-cols-[3.5rem_minmax(0,1fr)_auto] items-center gap-2 rounded-lg border-l-4 py-1.5 pr-2.5 pl-2 font-coc coc-slot"
                    style="border-left-color: {SIDE_COLOR[a.side]}"
                >
                    <span
                        class="flex flex-col text-[0.7rem] leading-tight text-parchment/60 tabular-nums"
                        title={a.seenAt ? `Seen ${formatDateTime(a.seenAt)}` : "Made before the tracker saw this war"}
                    >
                        <span class="font-bold text-parchment/85">#{a.order}</span>
                        {#if a.seenAt}<span>{formatAgo(a.seenAt, now)}</span>{/if}
                    </span>

                    <div class="flex min-w-0 flex-col gap-1">
                        <div class="flex min-w-0 items-center gap-1.5 text-sm">
                            <TownHall level={a.attackerTh} class="size-5" />
                            <span class="min-w-0 truncate font-bold text-white text-outline">
                                <span class="text-parchment/70 [text-shadow:none]">{a.attackerPos}.</span>
                                {names.get(a.attackerTag)}
                            </span>
                            <TablerArrowRight class="size-3.5 shrink-0 text-parchment/50" />
                            <TownHall level={a.defenderTh} class="size-5" />
                            <span class="min-w-0 truncate text-parchment">
                                <span class="text-parchment/60">{a.defenderPos}.</span>
                                {names.get(a.defenderTag)}
                            </span>
                        </div>
                        <div class="flex flex-wrap gap-1 text-[0.65rem] leading-none">
                            <span class="rounded bg-black/30 px-1.5 py-0.5 text-parchment/70">Hit {a.attackNo}</span>
                            {#if offMirror(a)}
                                <span class="rounded bg-[#a51f14]/80 px-1.5 py-0.5 font-bold text-white">Off mirror</span>
                            {:else if a.attackerPos === a.defenderPos}
                                <span class="rounded bg-black/30 px-1.5 py-0.5 text-[#c5e89a]">Mirror</span>
                            {/if}
                            {#if thDiff !== 0}
                                <span class={cn("rounded bg-black/30 px-1.5 py-0.5", thDiff > 0 ? "text-[#ffcd6a]" : "text-parchment/70")}>
                                    {thDiff > 0 ? `TH +${thDiff}` : `TH ${thDiff}`}
                                </span>
                            {/if}
                            {#if !a.fresh}
                                <span class="rounded bg-black/30 px-1.5 py-0.5 text-parchment/70">Clean-up</span>
                            {/if}
                        </div>
                    </div>

                    <div class="flex flex-col items-end gap-0.5">
                        <Stars stars={a.stars} newStars={a.newStars} class="size-4" />
                        <span class="text-xs text-parchment/80 tabular-nums">
                            <b class="text-white">{a.destruction}%</b> · {formatClock(a.duration)}
                        </span>
                    </div>
                </li>
            {/each}
        </ol>
        {#if filtered.length > limit}
            <button
                type="button"
                class="cursor-pointer self-center rounded-xl px-4 py-2 font-coc text-sm text-parchment coc-slot hover:text-white"
                onclick={() => (limit += PAGE)}
            >
                Show {Math.min(PAGE, filtered.length - limit)} more of {filtered.length - limit}
            </button>
        {/if}
    {/if}
</div>
