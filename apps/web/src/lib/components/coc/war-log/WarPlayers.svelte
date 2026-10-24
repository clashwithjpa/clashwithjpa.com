<script lang="ts">
    import { PUBLIC_SERVER_URL } from "$env/static/public";
    import CocDataTable from "$lib/components/ui/coc/CocDataTable.svelte";
    import CocInput from "$lib/components/ui/coc/CocInput.svelte";
    import CocTabs from "$lib/components/ui/coc/CocTabs.svelte";
    import type { TableColumn } from "$lib/components/ui/table/features";
    import TownHall from "$lib/components/ui/TownHall.svelte";
    import { cn } from "$lib/utils";
    import { getWarLogPlayers } from "@repo/clashofclans-client";
    import { renderSnippet, type SortingState } from "@tanstack/svelte-table";
    import TablerSearch from "~icons/tabler/search";
    import type { PlayerStats } from "./warLog";

    // `version` changes when a war finishes, so the totals refetch without a reload.
    let { tag, version }: { tag: string; version: string } = $props();

    type Window = "10" | "20" | "40";
    let windowSize = $state<Window>("20");
    let players = $state<PlayerStats[]>([]);
    let warCount = $state(0);
    let loading = $state(true);
    let failed = $state(false);
    let search = $state("");
    let sorting = $state<SortingState>([{ id: "missed", desc: true }]);

    $effect(() => {
        const wars = Number(windowSize);
        void version;
        let cancelled = false;
        loading = true;
        getWarLogPlayers(encodeURIComponent(tag), { wars }, { baseURL: PUBLIC_SERVER_URL })
            .then((r) => {
                if (cancelled) return;
                failed = !r.success;
                if (r.success) {
                    players = r.data.players;
                    warCount = r.data.wars.length;
                }
            })
            .catch(() => !cancelled && (failed = true))
            .finally(() => !cancelled && (loading = false));
        return () => (cancelled = true);
    });

    const right = { headerClass: "justify-end", cellClass: "text-right" };
    // Undefined sorts last either way, so players without hits never top a rate column.
    const per = (n: number, d: number) => (d ? n / d : undefined);

    const stat = (
        id: string,
        header: string,
        value: (p: PlayerStats) => number | undefined,
        show: (p: PlayerStats) => string,
        size: number,
        warn?: (p: PlayerStats) => boolean,
    ): TableColumn<PlayerStats> => ({
        id,
        header,
        size,
        accessorFn: value,
        sortUndefined: "last",
        cell: ({ row }) => renderSnippet(statCell, { text: show(row.original), warn: warn?.(row.original) ?? false }),
        meta: right,
    });

    const pct = (n: number | undefined) => (n === undefined ? "–" : `${Math.round(n * 100)}%`);

    const columns: TableColumn<PlayerStats>[] = [
        { id: "player", header: "Player", size: 190, accessorFn: (p) => p.name, cell: ({ row }) => renderSnippet(playerCell, row.original) },
        stat(
            "wars",
            "Wars",
            (p) => p.wars,
            (p) => String(p.wars),
            64,
        ),
        stat(
            "hits",
            "Hits",
            (p) => per(p.attacksUsed, p.attacksAvailable),
            (p) => `${p.attacksUsed}/${p.attacksAvailable}`,
            76,
        ),
        stat(
            "missed",
            "Missed",
            (p) => p.missed,
            (p) => String(p.missed),
            76,
            (p) => p.missed > 0,
        ),
        stat(
            "streak",
            "Streak",
            (p) => p.missedStreak,
            (p) => (p.missedStreak ? String(p.missedStreak) : "–"),
            72,
            (p) => p.missedStreak >= 3,
        ),
        stat(
            "avgStars",
            "★/hit",
            (p) => per(p.stars, p.attacksUsed),
            (p) => per(p.stars, p.attacksUsed)?.toFixed(2) ?? "–",
            70,
        ),
        stat(
            "triples",
            "3★",
            (p) => per(p.triples, p.attacksUsed),
            (p) => pct(per(p.triples, p.attacksUsed)),
            60,
        ),
        stat(
            "destruction",
            "Avg %",
            (p) => (p.attacksUsed ? p.avgDestruction : undefined),
            (p) => (p.attacksUsed ? `${Math.round(p.avgDestruction)}%` : "–"),
            70,
        ),
        stat(
            "mirror",
            "Mirror",
            (p) => per(p.mirrorFirst, p.firstAttacks),
            (p) => (p.firstAttacks ? `${p.mirrorFirst}/${p.firstAttacks}` : "–"),
            72,
        ),
        { id: "recent", header: "Recent", size: 132, enableSorting: false, cell: ({ row }) => renderSnippet(recentCell, row.original.recent) },
    ];

    const windows = [
        { key: "10" as const, label: "10 wars" },
        { key: "20" as const, label: "20 wars" },
        { key: "40" as const, label: "40 wars" },
    ];

    const pip = (n: number | null) => (n === null ? "bg-black/30" : n >= 2 ? "bg-[#58a221]" : n > 0 ? "bg-[#e68e2e]" : "bg-[#c22a1a]");
</script>

{#snippet playerCell(p: PlayerStats)}
    <span class="flex min-w-0 items-center gap-1.5">
        <TownHall level={p.th} class="size-6" />
        <span class="truncate font-bold text-white text-outline">{p.name}</span>
    </span>
{/snippet}

{#snippet statCell({ text, warn }: { text: string; warn: boolean })}
    <span class={cn(warn && "font-bold text-[#ff8a75]")}>{text}</span>
{/snippet}

{#snippet recentCell(recent: (number | null)[])}
    <span class="flex gap-0.5" title="Hits used per war, newest on the left">
        {#each recent.slice(0, 10) as n, i (i)}
            <span
                class={cn("h-3.5 w-2 rounded-xs border border-black/60", pip(n))}
                title={n === null ? "Not in this war" : `${n} hit${n === 1 ? "" : "s"}`}
            ></span>
        {/each}
    </span>
{/snippet}

<div class="flex flex-col gap-3">
    <div class="flex flex-col gap-2 md:flex-row md:items-center">
        <CocTabs label="Wars counted" options={windows} bind:value={windowSize} class="w-full md:w-fit" />
        <CocInput type="search" label="Search players" placeholder="Search players" bind:value={search} class="min-w-0 flex-1">
            {#snippet icon()}<TablerSearch class="size-4" />{/snippet}
        </CocInput>
    </div>

    {#if failed}
        <p class="rounded-xl p-6 text-center font-coc text-sm text-parchment/70 coc-slot">Couldn't load player totals. Try again in a moment.</p>
    {:else}
        {#if !loading && players.length}
            <p class="font-coc text-xs text-parchment/60">
                Totals over the last {warCount} finished war{warCount === 1 ? "" : "s"} with full attack detail. Click a column to sort.
            </p>
        {/if}
        <CocDataTable
            data={players}
            {columns}
            getRowId={(p) => p.tag}
            bind:sorting
            {search}
            searchText={(p) => p.name}
            loading={loading && !players.length}
            emptyText={players.length ? "No players match that search." : "No finished wars with full detail yet."}
            class={cn("transition-opacity duration-200", loading && players.length && "opacity-60")}
        />
    {/if}
</div>
