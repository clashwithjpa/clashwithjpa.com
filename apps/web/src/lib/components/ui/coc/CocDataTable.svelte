<script lang="ts" generics="T extends RowData">
    import OverlayScrollbar from "$lib/components/ui/OverlayScrollbar.svelte";
    import { features, type TableColumn } from "$lib/components/ui/table/features";
    import { cn } from "$lib/utils";
    import { createTable, FlexRender, type RowData, type SortingState, type Updater } from "@tanstack/svelte-table";
    import TablerChevronDown from "~icons/tabler/chevron-down";
    import TablerChevronUp from "~icons/tabler/chevron-up";

    // The admin DataTable's TanStack setup and column types, dressed for the public pages. It
    // keeps sorting and search but leaves out editing, filters and virtual rows, since public
    // lists are short.
    interface Props {
        data: T[];
        columns: TableColumn<T>[];
        getRowId: (row: T) => string;
        loading?: boolean;
        emptyText?: string;
        // Every whitespace-separated token in `search` must appear in `searchText(row)`.
        search?: string;
        searchText?: (row: T) => string;
        sorting?: SortingState;
        // The rows scroll under a sticky header past this height.
        maxHeight?: string;
        rowClass?: (row: T) => string | false | null | undefined;
        class?: string;
    }

    let {
        data,
        columns,
        getRowId,
        loading = false,
        emptyText = "Nothing to show",
        search = "",
        searchText,
        sorting = $bindable([]),
        maxHeight = "34rem",
        rowClass,
        class: className = "",
    }: Props = $props();

    const HEADER_HEIGHT = 36;
    const resolve = <S,>(updater: Updater<S>, prev: S): S => (typeof updater === "function" ? (updater as (p: S) => S)(prev) : updater);

    const filtered = $derived.by(() => {
        const tokens = search.trim().toLowerCase().split(/\s+/).filter(Boolean);
        if (!tokens.length || !searchText) return data;
        return data.filter((row) => {
            const haystack = searchText(row).toLowerCase();
            return tokens.every((t) => haystack.includes(t));
        });
    });

    const table = createTable({
        features,
        get data() {
            return filtered;
        },
        get columns() {
            return columns;
        },
        getRowId: (row) => getRowId(row),
        defaultColumn: { size: 90, minSize: 48, enableResizing: false },
        state: {
            get sorting() {
                return sorting;
            },
        },
        onSortingChange: (u) => (sorting = resolve(u, sorting)),
    });

    const rows = $derived(table.getRowModel().rows);
    let scrollEl = $state<HTMLDivElement | null>(null);
</script>

<div class={cn("relative min-w-0 overflow-hidden rounded-xl coc-slot", className)}>
    <div bind:this={scrollEl} class="relative overflow-auto overscroll-x-contain" style:max-height={maxHeight}>
        <table
            class="table-fixed border-separate border-spacing-0 font-coc text-sm text-parchment"
            style:width="{table.getTotalSize()}px"
            style:min-width="100%"
        >
            <colgroup>
                {#each table.getFlatHeaders() as header (header.id)}
                    <col style:width="{header.getSize()}px" />
                {/each}
            </colgroup>
            <thead>
                {#each table.getHeaderGroups() as group (group.id)}
                    <tr>
                        {#each group.headers as header (header.id)}
                            {@const column = header.column}
                            {@const sorted = column.getIsSorted()}
                            <th
                                class="sticky top-0 z-10 border-b border-black/50 bg-[#3a251c] p-0 text-[0.65rem] font-bold tracking-wider text-parchment/60 uppercase shadow-[0_1px_0_rgba(255,220,190,0.06)] first:pl-1.5 last:pr-1.5"
                                style:height="{HEADER_HEIGHT}px"
                                aria-sort={sorted === "asc" ? "ascending" : sorted === "desc" ? "descending" : undefined}
                            >
                                {#if !header.isPlaceholder}
                                    <div class={cn("flex h-full items-center px-1.5", column.columnDef.meta?.headerClass)}>
                                        {#if column.getCanSort()}
                                            <button
                                                type="button"
                                                class={cn(
                                                    "inline-flex min-w-0 cursor-pointer items-center gap-0.5 uppercase transition-colors duration-200 hover:text-white",
                                                    sorted && "text-white",
                                                )}
                                                onclick={column.getToggleSortingHandler()}
                                            >
                                                <span class="truncate"><FlexRender {header} /></span>
                                                {#if sorted === "asc"}
                                                    <TablerChevronUp class="size-3 shrink-0" />
                                                {:else if sorted === "desc"}
                                                    <TablerChevronDown class="size-3 shrink-0" />
                                                {/if}
                                            </button>
                                        {:else}
                                            <span class="truncate"><FlexRender {header} /></span>
                                        {/if}
                                    </div>
                                {/if}
                            </th>
                        {/each}
                    </tr>
                {/each}
            </thead>
            <tbody>
                {#each rows as row (row.id)}
                    <tr class={cn("group transition-colors duration-200 hover:bg-black/15", rowClass?.(row.original))}>
                        {#each row.getAllCells() as cell (cell.id)}
                            <td
                                class={cn(
                                    "truncate border-b border-black/20 px-1.5 py-1.5 tabular-nums group-last:border-b-0 first:pl-3 last:pr-3",
                                    cell.column.columnDef.meta?.cellClass,
                                )}
                            >
                                <FlexRender {cell} />
                            </td>
                        {/each}
                    </tr>
                {/each}
                {#if loading && !rows.length}
                    {#each { length: 8 }, r (r)}
                        <tr aria-hidden="true">
                            {#each columns as _, c (c)}
                                <td class="border-b border-black/20 px-1.5 py-3 first:pl-3 last:pr-3">
                                    <div class="h-3 animate-pulse rounded bg-black/25" style:width="{40 + ((r * 7 + c * 13) % 5) * 12}%"></div>
                                </td>
                            {/each}
                        </tr>
                    {/each}
                {/if}
            </tbody>
        </table>

        {#if !loading && !rows.length}
            <p class="px-4 py-8 text-center font-coc text-sm text-parchment/70">{emptyText}</p>
        {/if}
    </div>
    <OverlayScrollbar viewport={scrollEl} insetTop={HEADER_HEIGHT} tone="coc" />
</div>
