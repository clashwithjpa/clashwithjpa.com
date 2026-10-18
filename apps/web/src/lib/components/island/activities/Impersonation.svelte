<script lang="ts">
    import TablerSpy from "~icons/tabler/spy";
    import Pill from "./Pill.svelte";

    let { name, onStop }: { name: string; onStop: () => Promise<void> } = $props();
    let stopping = $state(false);

    async function stop(e: MouseEvent) {
        e.stopPropagation();
        stopping = true;
        try {
            await onStop();
        } finally {
            stopping = false;
        }
    }
</script>

<Pill title="Viewing as {name}" subtitle="Impersonating">
    {#snippet lead()}
        <span class="grid size-8 place-items-center rounded-full bg-amber-950 text-amber-300"><TablerSpy class="size-4" /></span>
    {/snippet}
    {#snippet trail()}
        <button
            type="button"
            class="cursor-pointer rounded-full bg-amber-900 px-3 py-1 text-xs font-medium text-amber-100 transition-colors hover:bg-amber-800 disabled:opacity-50"
            disabled={stopping}
            onclick={stop}
        >
            {stopping ? "Stopping…" : "Stop"}
        </button>
    {/snippet}
</Pill>
