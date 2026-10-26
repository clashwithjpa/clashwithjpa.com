<script lang="ts">
    import CocDataTable from "#lib/components/ui/coc/CocDataTable.svelte";
    import CocTabs from "#lib/components/ui/coc/CocTabs.svelte";
    import type { TableColumn } from "#lib/components/ui/table/features.js";
    import TownHall from "#lib/components/ui/TownHall.svelte";
    import { cn } from "#lib/utils.js";
    import { renderSnippet, type SortingState } from "@tanstack/svelte-table";
    import Stars from "./Stars.svelte";
    import { SIDE_COLOR, type Side, type WarDetail, type WarMember } from "./warLog";

    let { war }: { war: WarDetail } = $props();

    let side = $state<Side>("clan");
    let sorting = $state<SortingState>([{ id: "pos", desc: false }]);

    const right = { headerClass: "justify-end", cellClass: "text-right" };

    const columns: TableColumn<WarMember>[] = [
        { accessorKey: "pos", header: "#", size: 48, cell: ({ row }) => renderSnippet(posCell, row.original.pos) },
        { id: "player", header: "Player", size: 200, accessorFn: (m) => m.name, cell: ({ row }) => renderSnippet(playerCell, row.original) },
        { accessorKey: "attacks", header: "Hits", size: 64, cell: ({ row }) => renderSnippet(hitsCell, row.original.attacks) },
        {
            id: "stars",
            header: "Stars",
            size: 76,
            accessorFn: (m) => m.newStars * 1000 + m.stars,
            cell: ({ row }) => renderSnippet(starsCell, row.original),
        },
        {
            id: "destruction",
            header: "Avg %",
            size: 70,
            accessorFn: (m) => (m.attacks ? m.destruction / m.attacks : undefined),
            sortUndefined: "last",
            cell: ({ row }) => (row.original.attacks ? `${Math.round(row.original.destruction / row.original.attacks)}%` : "–"),
            meta: right,
        },
        {
            id: "defense",
            header: "Defense",
            size: 150,
            // Stars given up first, then destruction, so the best-held bases sort to one end.
            accessorFn: (m) => (m.bestDefense ? m.bestDefense.stars * 1000 + m.bestDefense.destruction : 0),
            cell: ({ row }) => renderSnippet(defenseCell, row.original),
            meta: right,
        },
    ];

    const sideOptions = $derived([
        { key: "clan" as const, label: war.clan.name ?? "Us" },
        { key: "opponent" as const, label: war.opponent.name ?? "Them" },
    ]);
</script>

{#snippet posCell(pos: number)}
    <span class="text-parchment/70">{pos}</span>
{/snippet}

{#snippet playerCell(m: WarMember)}
    <span class="flex min-w-0 items-center gap-1.5">
        <TownHall level={m.th} class="size-6" />
        <span class="truncate font-bold text-white text-outline">{m.name}</span>
    </span>
{/snippet}

{#snippet hitsCell(used: number)}
    <span class="flex gap-1" title="{used} of {war.attacksPerMember} hits used">
        {#each Array(war.attacksPerMember) as _, i (i)}
            <span
                class={cn("size-2.5 rounded-full border border-black", i >= used && "bg-black/40")}
                style={i < used ? `background: ${SIDE_COLOR[side]}` : undefined}
            ></span>
        {/each}
    </span>
{/snippet}

{#snippet starsCell(m: WarMember)}
    <span title="{m.newStars} new of {m.stars} stars"
        ><b class="text-white">{m.newStars}</b><span class="text-parchment/60">{` / ${m.stars}`}</span></span
    >
{/snippet}

{#snippet defenseCell(m: WarMember)}
    <span class="inline-flex items-center justify-end gap-1.5" title="{m.defenses} hit{m.defenses === 1 ? '' : 's'} taken">
        {#if m.bestDefense}
            <Stars stars={m.bestDefense.stars} class="size-3.5" />
            <span class="text-xs text-parchment/80">{m.bestDefense.destruction}%</span>
        {:else}
            <span class="text-xs text-[#c5e89a]">Untouched</span>
        {/if}
        <span class="text-xs text-parchment/50">×{m.defenses}</span>
    </span>
{/snippet}

<div class="flex flex-col gap-3">
    <CocTabs label="Lineup side" options={sideOptions} bind:value={side} class="w-full md:w-fit [&>*]:max-w-44 [&>*]:truncate" />
    <CocDataTable data={war[side].members} {columns} getRowId={(m) => m.tag} bind:sorting emptyText="No lineup stored for this war." />
</div>
