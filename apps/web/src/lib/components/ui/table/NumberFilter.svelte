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
    import type { NumberFilterOp, NumberFilterValue } from "./features";

    let { column }: { column: Column<any, any, any> } = $props();

    const OPS: Option[] = [
        { label: "Equals", value: "eq" },
        { label: "Does not equal", value: "ne" },
        { label: "Greater than", value: "gt" },
        { label: "Greater than or equal", value: "gte" },
        { label: "Less than", value: "lt" },
        { label: "Less than or equal", value: "lte" },
        { label: "Between", value: "between" },
        { label: "Blank", value: "blank" },
        { label: "Not blank", value: "notBlank" },
    ];

    let open = $state(false);
    let current = $derived(column.getFilterValue() as NumberFilterValue | undefined);
    let op = $state<string>("eq");
    // A number input binds a number once typed into, and "" when empty.
    let a = $state<string | number>("");
    let b = $state<string | number>("");
    let needsValue = $derived(op !== "blank" && op !== "notBlank");

    $effect(() => {
        if (!open) return;
        op = current?.op ?? "eq";
        a = current?.a != null ? String(current.a) : "";
        b = current?.b != null ? String(current.b) : "";
    });

    const toNumber = (v: string | number | null | undefined) => {
        const s = String(v ?? "").trim();
        return s === "" || Number.isNaN(Number(s)) ? null : Number(s);
    };

    function apply() {
        column.setFilterValue({ op: op as NumberFilterOp, a: toNumber(a), b: toNumber(b) } satisfies NumberFilterValue);
        open = false;
    }

    function clear() {
        column.setFilterValue(undefined);
        open = false;
    }

    function onKeydown(e: KeyboardEvent) {
        if (e.key === "Enter") apply();
    }
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
        {#if needsValue}
            <Input type="number" placeholder={op === "between" ? "From" : "Value"} bind:value={a} onkeydown={onKeydown} />
            {#if op === "between"}
                <Input type="number" placeholder="To" bind:value={b} onkeydown={onKeydown} />
            {/if}
        {/if}
        <div class="flex justify-end gap-2 pt-1">
            <Button variant="ghost" size="sm" onclick={clear}>Clear</Button>
            <Button variant="base" size="sm" onclick={apply}>Apply</Button>
        </div>
    </div>
</RawPopup>
