<script lang="ts" generics="T extends RowData">
    /* eslint-disable @typescript-eslint/no-explicit-any */
    import Input from "#lib/components/ui/Input.svelte";
    import OverlayScrollbar from "#lib/components/ui/OverlayScrollbar.svelte";
    import Select from "#lib/components/ui/Select.svelte";
    import { cn } from "#lib/utils.js";
    import {
        createTable,
        FlexRender,
        renderSnippet,
        type Cell,
        type Column,
        type ColumnFiltersState,
        type ColumnSizingState,
        type Row,
        type RowData,
        type RowSelectionState,
        type SortingState,
        type Table,
        type Updater,
    } from "@tanstack/svelte-table";
    import { createVirtualizer } from "@tanstack/svelte-virtual";
    import { untrack } from "svelte";
    import { get } from "svelte/store";
    import TablerArrowDown from "~icons/tabler/arrow-down";
    import TablerArrowUp from "~icons/tabler/arrow-up";
    import TablerChevronDown from "~icons/tabler/chevron-down";
    import TablerPencil from "~icons/tabler/pencil";
    import { setPopupHost } from "../popupHost";
    import { sidebarStore } from "../sidebar";
    import DateFilter from "./DateFilter.svelte";
    import { features, setKey, type Features, type TableColumn } from "./features";
    import NumberFilter from "./NumberFilter.svelte";
    import SetFilter from "./SetFilter.svelte";

    interface Props {
        data: T[];
        columns: TableColumn<T>[];
        getRowId: (row: T) => string;
        rowHeight?: number;
        loading?: boolean;
        emptyText?: string;
        // Client-side quick filter: every whitespace-separated token in `search`
        // must appear in `searchText(row)`.
        search?: string;
        searchText?: (row: T) => string;
        sorting?: SortingState;
        // The page sorts on the server and passes rows in that order.
        manualSorting?: boolean;
        selectable?: boolean;
        rowSelection?: RowSelectionState;
        // Clusters rows by key after sorting (the sort then orders rows within each
        // group) and bands alternate groups.
        groupBy?: (row: T) => string;
        groupCompare?: (a: string, b: string) => number;
        rowClass?: (row: T) => string | false | null | undefined;
        onEndReached?: () => void;
        class?: string;
    }

    let {
        data,
        columns,
        getRowId,
        rowHeight = 56,
        loading = false,
        emptyText = "No rows to show",
        search = "",
        searchText,
        sorting = $bindable([]),
        manualSorting = false,
        selectable = false,
        rowSelection = $bindable({}),
        groupBy,
        groupCompare,
        rowClass,
        onEndReached,
        class: className = "",
    }: Props = $props();

    const HEADER_HEIGHT = 48;
    const resolve = <S,>(updater: Updater<S>, prev: S): S => (typeof updater === "function" ? (updater as (p: S) => S)(prev) : updater);

    let filteredData = $derived.by(() => {
        const tokens = search.trim().toLowerCase().split(/\s+/).filter(Boolean);
        if (tokens.length === 0 || !searchText) return data;
        return data.filter((row) => {
            const haystack = searchText(row).toLowerCase();
            return tokens.every((t) => haystack.includes(t));
        });
    });

    const selectColumn: TableColumn<T> = {
        id: "__select",
        size: 48,
        minSize: 48,
        enableSorting: false,
        enableResizing: false,
        header: ({ table }) => renderSnippet(selectAllCheckbox, table as Table<Features, any>),
        cell: ({ row }) => renderSnippet(selectRowCheckbox, row as Row<Features, any>),
    };
    // A column's `meta.filter` picks its filter function, so pages only declare the UI.
    let allColumns = $derived.by(() => {
        const withFilters = columns.map((c) => (c.meta?.filter ? { ...c, filterFn: c.meta.filter } : c)) as TableColumn<T>[];
        return selectable ? [selectColumn, ...withFilters] : withFilters;
    });

    let columnFilters = $state<ColumnFiltersState>([]);
    let columnSizing = $state<ColumnSizingState>({});

    const table = createTable({
        features,
        get data() {
            return filteredData;
        },
        get columns() {
            return allColumns;
        },
        getRowId: (row) => getRowId(row),
        get manualSorting() {
            return manualSorting;
        },
        sortDescFirst: false,
        isMultiSortEvent: (e) => (e as MouseEvent).ctrlKey || (e as MouseEvent).metaKey,
        columnResizeMode: "onChange",
        defaultColumn: { size: 150, minSize: 60 },
        state: {
            get sorting() {
                return sorting;
            },
            get rowSelection() {
                return rowSelection;
            },
            get columnFilters() {
                return columnFilters;
            },
            get columnSizing() {
                return columnSizing;
            },
        },
        onSortingChange: (u) => (sorting = resolve(u, sorting)),
        onRowSelectionChange: (u) => (rowSelection = resolve(u, rowSelection)),
        onColumnFiltersChange: (u) => (columnFilters = resolve(u, columnFilters)),
        onColumnSizingChange: (u) => (columnSizing = resolve(u, columnSizing)),
    });

    let rows = $derived.by(() => {
        const sorted = table.getRowModel().rows;
        if (!groupBy) return sorted;
        const groups = new Map<string, Row<Features, T>[]>();
        for (const row of sorted) {
            const key = groupBy(row.original);
            const group = groups.get(key);
            if (group) group.push(row);
            else groups.set(key, [row]);
        }
        return [...groups.keys()].sort(groupCompare).flatMap((key) => groups.get(key)!);
    });

    // Per displayed index: alternating band and whether the row starts a new group.
    let groupMarks = $derived.by(() => {
        if (!groupBy) return null;
        const marks: { band: boolean; divider: boolean }[] = [];
        let band = false;
        let prev: string | null = null;
        rows.forEach((row, i) => {
            const key = groupBy(row.original);
            const divider = i > 0 && key !== prev;
            if (divider) band = !band;
            marks.push({ band, divider });
            prev = key;
        });
        return marks;
    });

    export function getActiveFilterCount(): number {
        return columnFilters.length;
    }

    export function clearFilters() {
        columnFilters = [];
    }

    // Distinct values in the column (before column filters) with row counts.
    function setFilterOptions(column: Column<Features, T, unknown>) {
        const counts = new Map<string, number>();
        for (const row of table.getCoreRowModel().rows) {
            const key = setKey(row.getValue(column.id));
            counts.set(key, (counts.get(key) ?? 0) + 1);
        }
        const label = column.columnDef.meta?.filterLabel ?? ((v: string) => v || "(Blank)");
        return [...counts]
            .map(([value, count]) => ({ value, label: label(value), count }))
            .sort((a, b) => (a.value === "" ? 1 : b.value === "" ? -1 : a.label.localeCompare(b.label)));
    }

    export function getDisplayedCount(): number {
        return rows.length;
    }

    export function getDisplayedRows(): T[] {
        return rows.map((r) => r.original);
    }

    export function getTable(): Table<Features, T> {
        return table;
    }

    let scrollEl = $state<HTMLDivElement | null>(null);
    // Columns stretch to fill spare width. The details panel narrows the page, which would
    // squeeze every column, so the width is only tracked while the panel is closed: with it
    // open the table keeps its full width and scrolls sideways, like a table that never had
    // spare room.
    let viewWidth = $state(0);
    let fillWidth = $state(0);
    $effect(() => {
        if (!sidebarStore.isOpen && viewWidth) fillWidth = viewWidth;
    });
    let popupBoundary = $state<HTMLDivElement | null>(null);
    setPopupHost({ container: () => scrollEl, boundary: () => popupBoundary });
    const virtualizer = createVirtualizer<HTMLDivElement, HTMLTableRowElement>({
        count: 0,
        getScrollElement: () => scrollEl,
        estimateSize: () => rowHeight,
        overscan: 8,
    });

    // The store adapter doesn't track getter options, so push the reactive ones.
    $effect(() => {
        const list = rows;
        get(virtualizer).setOptions({
            count: list.length,
            getScrollElement: () => scrollEl,
            estimateSize: () => rowHeight,
            getItemKey: (index) => list[index]?.id ?? index,
            scrollMargin: HEADER_HEIGHT,
        });
    });

    let virtualItems = $derived($virtualizer.getVirtualItems());
    let paddingTop = $derived(virtualItems.length ? virtualItems[0].start - HEADER_HEIGHT : 0);
    let paddingBottom = $derived(virtualItems.length ? $virtualizer.getTotalSize() + HEADER_HEIGHT - virtualItems[virtualItems.length - 1].end : 0);

    $effect(() => {
        const last = virtualItems[virtualItems.length - 1];
        if (onEndReached && last && last.index >= rows.length - 10) untrack(() => onEndReached());
    });

    // --- Cell focus, keyboard navigation and inline editing ---
    // Spreadsheet-style: a click focuses a cell, then Enter/F2/typing (or a second
    // click, or a double-click) edits it. Dropdown cells open on the first click.
    let focused = $state<{ rowId: string; colId: string } | null>(null);
    let editing = $state<{ rowId: string; colId: string; value: string; selectAll: boolean } | null>(null);
    let editorOpen = $state(false);

    let columnIds = $derived(table.getAllLeafColumns().map((c) => c.id));

    const isFocused = (cell: Cell<Features, T, unknown>) => focused?.rowId === cell.row.id && focused.colId === cell.column.id;
    const isEditing = (cell: Cell<Features, T, unknown>) => editing?.rowId === cell.row.id && editing.colId === cell.column.id;

    function canEditCell(cell: Cell<Features, T, unknown>) {
        const edit = cell.column.columnDef.meta?.edit;
        return !!edit && edit.canEdit?.(cell.row.original) !== false;
    }

    function findCell(rowId: string, colId: string) {
        return rows
            .find((r) => r.id === rowId)
            ?.getAllCells()
            .find((c) => c.column.id === colId);
    }

    // Only reclaim focus when nothing else took it (e.g. the search box).
    function restoreFocus() {
        requestAnimationFrame(() => {
            const active = document.activeElement;
            if (!active || active === document.body || scrollEl?.contains(active)) scrollEl?.focus({ preventScroll: true });
        });
    }

    async function focusCell(rowIndex: number, colId: string) {
        const row = rows[rowIndex];
        if (!row) return;
        focused = { rowId: row.id, colId };
        const selector = `[data-cell="${CSS.escape(`${row.id}:${colId}`)}"]`;
        let el = scrollEl?.querySelector(selector);
        if (!el) {
            get(virtualizer).scrollToIndex(rowIndex, { align: "auto" });
            await new Promise(requestAnimationFrame);
            el = scrollEl?.querySelector(selector);
        }
        el?.scrollIntoView({ block: "nearest", inline: "nearest" });
    }

    function moveFocus(dRow: number, dCol: number): boolean {
        if (!rows.length || !columnIds.length) return false;
        const rowIndex = focused ? rows.findIndex((r) => r.id === focused!.rowId) : -1;
        const colIndex = focused ? columnIds.indexOf(focused.colId) : -1;
        if (rowIndex === -1 || colIndex === -1) {
            void focusCell(0, columnIds.find((id) => id !== "__select") ?? columnIds[0]);
            return true;
        }
        const nextRow = rowIndex + dRow;
        const nextCol = colIndex + dCol;
        if (nextRow < 0 || nextRow >= rows.length || nextCol < 0 || nextCol >= columnIds.length) return false;
        void focusCell(nextRow, columnIds[nextCol]);
        return true;
    }

    function startEdit(cell: Cell<Features, T, unknown>, initial?: string) {
        if (!canEditCell(cell) || isEditing(cell)) return;
        const value = cell.getValue();
        focused = { rowId: cell.row.id, colId: cell.column.id };
        editing = {
            rowId: cell.row.id,
            colId: cell.column.id,
            value: initial ?? (value == null ? "" : String(value)),
            selectAll: initial === undefined,
        };
        editorOpen = true;
    }

    function commitEdit(cell: Cell<Features, T, unknown>, value = editing?.value) {
        const edit = cell.column.columnDef.meta?.edit;
        if (!editing || !edit || value === undefined) return;
        editing = null;
        const old = cell.getValue();
        if (String(old ?? "") === value) return;
        void edit.commit(cell.row.original, edit.type === "number" ? Number(value) : value);
    }

    function cancelEdit() {
        editing = null;
        restoreFocus();
    }

    function onEditorKeydown(e: KeyboardEvent, cell: Cell<Features, T, unknown>) {
        if (e.key === "Enter") {
            e.preventDefault();
            commitEdit(cell);
            moveFocus(e.shiftKey ? -1 : 1, 0);
            restoreFocus();
        } else if (e.key === "Tab") {
            e.preventDefault();
            commitEdit(cell);
            moveFocus(0, e.shiftKey ? -1 : 1);
            restoreFocus();
        } else if (e.key === "Escape") {
            e.stopPropagation();
            cancelEdit();
        }
    }

    function onCellClick(e: MouseEvent, cell: Cell<Features, T, unknown>) {
        const wasFocused = isFocused(cell);
        focused = { rowId: cell.row.id, colId: cell.column.id };
        // Buttons, badges and checkboxes inside a cell keep their own focus.
        if ((e.target as Element).closest("button, input, a, [role='button']")) return;
        scrollEl?.focus({ preventScroll: true });
        if (cell.column.columnDef.meta?.edit?.type === "select" || wasFocused) startEdit(cell);
    }

    function onTableKeydown(e: KeyboardEvent) {
        // Keys typed into an editor or a control inside a cell aren't navigation.
        if (e.target !== scrollEl || editing) return;
        const moves: Record<string, [number, number]> = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] };
        if (e.key in moves) {
            if (moveFocus(...moves[e.key])) e.preventDefault();
            return;
        }
        if (e.key === "Tab") {
            if (focused && moveFocus(0, e.shiftKey ? -1 : 1)) e.preventDefault();
            return;
        }
        if (!focused) return;
        if (e.key === "Escape") {
            focused = null;
            return;
        }
        const cell = findCell(focused.rowId, focused.colId);
        if (!cell || !canEditCell(cell)) return;
        const type = cell.column.columnDef.meta?.edit?.type;
        if (e.key === "Enter" || e.key === "F2") {
            e.preventDefault();
            startEdit(cell);
        } else if (type !== "select" && (e.key === "Backspace" || e.key === "Delete")) {
            e.preventDefault();
            startEdit(cell, "");
        } else if (type !== "select" && e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
            // Typing replaces the value, like a spreadsheet.
            e.preventDefault();
            startEdit(cell, e.key);
        }
    }

    function focusOnMount(el: HTMLInputElement | null) {
        if (!el) return;
        el.focus();
        if (editing?.selectAll) el.select();
        else el.setSelectionRange(el.value.length, el.value.length);
    }

    // Closing the select popup without picking an option cancels the edit.
    $effect(() => {
        if (!editorOpen && editing) {
            const colId = editing.colId;
            if (table.getColumn(colId)?.columnDef.meta?.edit?.type === "select") untrack(() => cancelEdit());
        }
    });
</script>

{#snippet selectAllCheckbox(t: Table<Features, any>)}
    <Input
        type="checkbox"
        checked={t.getIsAllRowsSelected()}
        indeterminate={!t.getIsAllRowsSelected() && t.getIsSomeRowsSelected()}
        onclick={t.getToggleAllRowsSelectedHandler()}
        aria-label="Select all rows"
    />
{/snippet}

{#snippet selectRowCheckbox(row: Row<Features, any>)}
    <Input type="checkbox" checked={row.getIsSelected()} onclick={row.getToggleSelectedHandler()} aria-label="Select row" />
{/snippet}

<div class={cn("relative size-full", className)}>
    <div
        bind:this={scrollEl}
        bind:clientWidth={viewWidth}
        tabindex="0"
        role="grid"
        aria-rowcount={rows.length}
        onkeydown={onTableKeydown}
        class="relative size-full overflow-auto border-t-2 border-stone-700/50 outline-none"
    >
        <table
            class="table-fixed border-separate border-spacing-0 text-sm text-stone-200"
            style:width="{table.getTotalSize()}px"
            style:min-width={fillWidth ? `${fillWidth}px` : "100%"}
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
                                class={cn(
                                    "sticky top-0 z-10 border-r border-b-2 border-stone-700/50 bg-stone-900 p-0 text-left font-semibold text-stone-200 last:border-r-0",
                                    column.columnDef.meta?.headerClass,
                                )}
                                style:height="{HEADER_HEIGHT}px"
                            >
                                {#if !header.isPlaceholder}
                                    <div class="flex h-full items-center gap-1 px-3">
                                        {#if column.getCanSort()}
                                            <button
                                                type="button"
                                                class="flex min-w-0 flex-1 cursor-pointer items-center gap-1 text-left"
                                                onclick={column.getToggleSortingHandler()}
                                            >
                                                <span class="truncate"><FlexRender {header} /></span>
                                                {#if sorted === "asc"}
                                                    <TablerArrowUp class="size-3.5 shrink-0 text-stone-400" />
                                                {:else if sorted === "desc"}
                                                    <TablerArrowDown class="size-3.5 shrink-0 text-stone-400" />
                                                {/if}
                                                {#if sorted && sorting.length > 1}
                                                    <span class="text-xs text-stone-500">{column.getSortIndex() + 1}</span>
                                                {/if}
                                            </button>
                                        {:else}
                                            <div class="flex min-w-0 flex-1 items-center truncate"><FlexRender {header} /></div>
                                        {/if}
                                        {#if column.columnDef.meta?.filter === "number"}
                                            <NumberFilter column={column as Column<any, any, any>} />
                                        {:else if column.columnDef.meta?.filter === "date"}
                                            <DateFilter column={column as Column<any, any, any>} />
                                        {:else if column.columnDef.meta?.filter === "set"}
                                            <SetFilter column={column as Column<any, any, any>} getOptions={() => setFilterOptions(column)} />
                                        {/if}
                                    </div>
                                    {#if column.getCanResize()}
                                        <!-- svelte-ignore a11y_no_static_element_interactions -->
                                        <div
                                            class={cn(
                                                "absolute top-0 right-0 h-full w-1.5 cursor-col-resize touch-none transition-colors select-none hover:bg-stone-600",
                                                column.getIsResizing() && "bg-stone-400",
                                            )}
                                            onmousedown={header.getResizeHandler()}
                                            ontouchstart={header.getResizeHandler()}
                                            ondblclick={() => column.resetSize()}
                                        ></div>
                                    {/if}
                                {/if}
                            </th>
                        {/each}
                    </tr>
                {/each}
            </thead>
            <tbody>
                {#if paddingTop > 0}
                    <tr aria-hidden="true"><td style:height="{paddingTop}px" colspan={allColumns.length}></td></tr>
                {/if}
                {#each virtualItems as item (item.key)}
                    {@const row = rows[item.index]}
                    {@const mark = groupMarks?.[item.index]}
                    {#if row}
                        <tr
                            class={cn(
                                "group transition-colors hover:bg-stone-900",
                                mark?.band && "bg-stone-700/16",
                                row.getIsSelected() && "bg-stone-800 hover:bg-stone-800",
                                rowClass?.(row.original),
                            )}
                            style:height="{rowHeight}px"
                        >
                            {#each row.getAllCells() as cell (cell.id)}
                                {@const meta = cell.column.columnDef.meta}
                                {@const editable = canEditCell(cell)}
                                {@const cellEditing = isEditing(cell) && !!editing}
                                <td
                                    data-cell="{row.id}:{cell.column.id}"
                                    class={cn(
                                        "group/cell relative scroll-mt-12 overflow-hidden border-r border-b border-stone-700/50 px-2 text-ellipsis whitespace-nowrap last:border-r-0",
                                        mark?.divider && "border-t-2 border-t-stone-600",
                                        editable && "pr-7",
                                        editable && meta?.edit?.type === "select" && "cursor-pointer",
                                        cellEditing && "p-0",
                                        meta?.cellClass,
                                    )}
                                    onclick={(e) => onCellClick(e, cell)}
                                    ondblclick={() => startEdit(cell)}
                                >
                                    {#if cellEditing && editing}
                                        {#if meta?.edit?.type === "select"}
                                            <Select
                                                options={meta.edit.options?.() ?? []}
                                                bind:value={editing.value}
                                                bind:open={editorOpen}
                                                onValueChange={(v) => {
                                                    commitEdit(cell, v);
                                                    restoreFocus();
                                                }}
                                                class="h-full"
                                                triggerClass="h-full rounded-none border-0 bg-stone-900 px-2 shadow-none ring-0"
                                            />
                                        {:else}
                                            <input
                                                {@attach focusOnMount}
                                                type="text"
                                                inputmode={meta?.edit?.type === "number" ? "numeric" : "text"}
                                                bind:value={editing.value}
                                                onkeydown={(e) => onEditorKeydown(e, cell)}
                                                onblur={() => commitEdit(cell)}
                                                class="size-full border-0 bg-stone-900 px-2 text-sm text-stone-50 shadow-none outline-none focus:border-0 focus:shadow-none focus:ring-0 focus:outline-none"
                                            />
                                        {/if}
                                    {:else}
                                        <FlexRender {cell} />
                                        {#if editable}
                                            {@const Hint = meta?.edit?.type === "select" ? TablerChevronDown : TablerPencil}
                                            <Hint
                                                class={cn(
                                                    "pointer-events-none absolute top-1/2 right-2 size-3.5 -translate-y-1/2 text-stone-500 opacity-0 transition-opacity group-hover/cell:opacity-100",
                                                    isFocused(cell) && "opacity-100",
                                                )}
                                            />
                                        {/if}
                                    {/if}
                                    {#if isFocused(cell)}
                                        <div class="pointer-events-none absolute inset-0 ring-2 ring-stone-500 ring-inset"></div>
                                    {/if}
                                </td>
                            {/each}
                        </tr>
                    {/if}
                {/each}
                {#if paddingBottom > 0}
                    <tr aria-hidden="true"><td style:height="{paddingBottom}px" colspan={allColumns.length}></td></tr>
                {/if}
                {#if loading && rows.length === 0}
                    {#each { length: 10 }, r (r)}
                        <tr aria-hidden="true" style:height="{rowHeight}px">
                            {#each allColumns as col, c (c)}
                                <td class="border-r border-b border-stone-700/50 px-2 last:border-r-0">
                                    {#if col.id === selectColumn.id}
                                        <div class="mx-auto size-4 skeleton rounded"></div>
                                    {:else}
                                        <div class="h-3.5 skeleton" style:width="{40 + ((r * 7 + c * 13) % 5) * 12}%"></div>
                                    {/if}
                                </td>
                            {/each}
                        </tr>
                    {/each}
                {/if}
            </tbody>
        </table>

        {#if !loading && rows.length === 0}
            <div class="absolute inset-x-0 py-10 text-center text-sm text-stone-400" style:top="{HEADER_HEIGHT}px">{emptyText}</div>
        {/if}
    </div>
    <OverlayScrollbar viewport={scrollEl} insetTop={HEADER_HEIGHT} />
    <!-- The table body below the sticky header; popups from cells stay inside it. -->
    <div
        bind:this={popupBoundary}
        aria-hidden="true"
        class="pointer-events-none invisible absolute inset-x-0 bottom-0"
        style:top="{HEADER_HEIGHT + 2}px"
    ></div>
</div>
