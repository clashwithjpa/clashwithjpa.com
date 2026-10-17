<script lang="ts">
    let { tag, name }: { tag: string | null | undefined; name: string | null | undefined } = $props();
</script>

{#if tag}
    <div class="flex min-w-0 flex-col justify-center">
        <span class="truncate text-sm font-medium text-stone-200">{name ?? "Unknown clan"}</span>
        <span class="truncate font-mono text-xs text-stone-400">{tag}</span>
    </div>
{:else}
    <span class="text-sm text-stone-400">—</span>
{/if}
