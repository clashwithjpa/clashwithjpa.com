<script lang="ts">
    import Input from "$lib/components/ui/Input.svelte";
    import type { ICellEditorParams } from "ag-grid-community";

    let { params }: { params: ICellEditorParams & { type?: "text" | "number" | "password" } } = $props();

    let currentValue = $derived(params.value);

    $effect(() => {
        (params as any)._currentValue = currentValue;
    });

    let inputRef: HTMLInputElement | null = $state(null);

    $effect(() => {
        if (inputRef && typeof inputRef.focus === "function") {
            inputRef.focus();
        }
    });

    function handleKeyDown(e: KeyboardEvent) {
        if (e.key === "Enter") {
            params.stopEditing();
        }
    }
</script>

<div class="m-0 flex h-full w-full items-center justify-center bg-stone-950 p-0">
    <Input
        type={params.type || "text"}
        bind:value={currentValue}
        bind:ref={inputRef as any}
        class="h-full w-full rounded-none border-none! bg-transparent! focus-visible:ring-0!"
        onkeydown={handleKeyDown}
    />
</div>
