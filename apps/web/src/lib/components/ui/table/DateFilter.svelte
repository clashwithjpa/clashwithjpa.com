<script lang="ts">
    /* eslint-disable @typescript-eslint/no-explicit-any */
    import Button from "$lib/components/ui/Button.svelte";
    import Input from "$lib/components/ui/Input.svelte";
    import RawPopup from "$lib/components/ui/RawPopup.svelte";
    import Select, { type Option } from "$lib/components/ui/Select.svelte";
    import { cn } from "$lib/utils";
    import type { Column } from "@tanstack/svelte-table";
    import TablerFilter from "~icons/tabler/filter";
    import TablerFilterFilled from "~icons/tabler/filter-filled";
    import { clearPopupHost } from "../popupHost";
    import { localDay, type DateFilterOp, type DateFilterValue } from "./features";

    let { column }: { column: Column<any, any, any> } = $props();

    const OPS: Option[] = [
        { label: "In the last", value: "last" },
        { label: "On", value: "on" },
        { label: "Before", value: "before" },
        { label: "After", value: "after" },
        { label: "Between", value: "between" },
    ];

    clearPopupHost();

    let open = $state(false);
    let current = $derived(column.getFilterValue() as DateFilterValue | undefined);
    let op = $state<string>("last");
    let a = $state("");
    let b = $state("");
    let days = $state<string | number>("");
    const today = localDay(new Date());

    $effect(() => {
        if (!open) return;
        op = current?.op ?? "last";
        a = current?.a ?? "";
        b = current?.b ?? "";
        days = current?.days != null ? String(current.days) : "";
    });

    function apply() {
        const n = Number(String(days).trim());
        column.setFilterValue({
            op: op as DateFilterOp,
            a: a || null,
            b: b || null,
            days: Number.isFinite(n) && n > 0 ? n : null,
        } satisfies DateFilterValue);
        open = false;
    }

    function clear() {
        column.setFilterValue(undefined);
        open = false;
    }

    function onKeydown(e: KeyboardEvent) {
        if (e.key === "Enter") apply();
    }

    const dateClass =
        "w-full min-w-0 rounded-lg border-2 border-stone-700/50 bg-stone-900 px-4 py-2 text-sm text-stone-50 scheme-dark outline-none transition-colors duration-200 focus-visible:border-stone-700 focus-visible:ring-4 focus-visible:ring-stone-700/50";
</script>

<RawPopup bind:open placement="bottom-end" maxWidth="w-64" contentClass="p-3">
    {#snippet trigger()}
        <span
            class={cn(
                "grid size-6 place-items-center rounded-md transition-colors hover:bg-stone-700/50 hover:text-stone-50",
                current ? "text-stone-50" : "text-stone-500",
            )}
            title="Filter"
        >
            {#if current}
                <TablerFilterFilled class="size-3.5" />
            {:else}
                <TablerFilter class="size-3.5" />
            {/if}
        </span>
    {/snippet}

    <div class="flex flex-col gap-2 text-sm font-normal">
        <Select options={OPS} bind:value={op} />
        {#if op === "last"}
            <div class="flex items-center gap-2">
                <Input type="number" placeholder="Days" min={1} bind:value={days} onkeydown={onKeydown} />
                <span class="shrink-0 text-stone-400">days</span>
            </div>
        {:else}
            <input type="date" class={dateClass} max={today} aria-label={op === "between" ? "From" : "Date"} bind:value={a} onkeydown={onKeydown} />
            {#if op === "between"}
                <input type="date" class={dateClass} max={today} aria-label="To" bind:value={b} onkeydown={onKeydown} />
            {/if}
        {/if}
        <div class="flex justify-end gap-2 pt-1">
            <Button variant="ghost" size="sm" onclick={clear}>Clear</Button>
            <Button variant="base" size="sm" onclick={apply}>Apply</Button>
        </div>
    </div>
</RawPopup>
