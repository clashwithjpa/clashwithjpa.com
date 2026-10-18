<script lang="ts">
    /* eslint-disable @typescript-eslint/no-explicit-any */
    import Button from "$lib/components/ui/Button.svelte";
    import Input from "$lib/components/ui/Input.svelte";
    import RawPopup from "$lib/components/ui/RawPopup.svelte";
    import { cn } from "$lib/utils";
    import type { Column } from "@tanstack/svelte-table";
    import TablerFilter from "~icons/tabler/filter";
    import TablerFilterFilled from "~icons/tabler/filter-filled";
    import { clearPopupHost } from "../popupHost";

    type SetOption = { value: string; label: string; count: number };

    let { column, getOptions }: { column: Column<any, any, any>; getOptions: () => SetOption[] } = $props();

    // Anchored in the sticky header, which the table body host sits below.
    clearPopupHost();

    let open = $state(false);
    let search = $state("");
    let selected = $derived((column.getFilterValue() as string[] | undefined) ?? []);
    // Only computed while the popup is open.
    let options = $derived(open ? getOptions() : []);
    let visible = $derived(search.trim() ? options.filter((o) => o.label.toLowerCase().includes(search.trim().toLowerCase())) : options);

    $effect(() => {
        if (!open) search = "";
    });

    function toggle(value: string) {
        const next = selected.includes(value) ? selected.filter((v) => v !== value) : [...selected, value];
        column.setFilterValue(next.length ? next : undefined);
    }

    function selectVisible() {
        column.setFilterValue([...new Set([...selected, ...visible.map((o) => o.value)])]);
    }

    function clear() {
        column.setFilterValue(undefined);
    }
</script>

<RawPopup bind:open placement="bottom-end" maxWidth="w-72" contentClass="p-2">
    {#snippet trigger()}
        <span
            class={cn(
                "grid size-6 place-items-center rounded-md transition-colors hover:bg-stone-700/50 hover:text-stone-50",
                selected.length ? "text-stone-50" : "text-stone-500",
            )}
            title="Filter"
        >
            {#if selected.length}
                <TablerFilterFilled class="size-3.5" />
            {:else}
                <TablerFilter class="size-3.5" />
            {/if}
        </span>
    {/snippet}

    <div class="flex flex-col gap-2 text-sm font-normal">
        {#if options.length > 8}
            <Input placeholder="Search…" bind:value={search} />
        {/if}
        <div class="flex max-h-72 flex-col overflow-y-auto">
            {#each visible as option (option.value)}
                <label class="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-stone-700/50">
                    <Input type="checkbox" checked={selected.includes(option.value)} onchange={() => toggle(option.value)} />
                    <span class={cn("min-w-0 flex-1 truncate", option.value === "" ? "text-stone-400 italic" : "text-stone-200")}>{option.label}</span
                    >
                    <span class="shrink-0 text-xs text-stone-500">{option.count}</span>
                </label>
            {:else}
                <p class="py-2 text-center text-stone-400">No matches</p>
            {/each}
        </div>
        <div class="flex items-center justify-between gap-2 border-t border-stone-800 pt-2">
            <span class="text-xs text-stone-400">{selected.length ? `${selected.length} selected` : "Showing all"}</span>
            <div class="flex gap-2">
                <Button variant="ghost" size="sm" disabled={visible.length === 0} onclick={selectVisible}>Select all</Button>
                <Button variant="base" size="sm" disabled={!selected.length} onclick={clear}>Clear</Button>
            </div>
        </div>
    </div>
</RawPopup>
