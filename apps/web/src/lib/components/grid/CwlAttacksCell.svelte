<script lang="ts">
    let { attacks, loading = false }: { attacks?: number; loading?: boolean } = $props();
</script>

{#if attacks == null}
    {#if loading}
        <span class="block h-3.5 w-10 animate-pulse rounded bg-stone-700/60"></span>
    {:else}
        <span class="text-stone-600">—</span>
    {/if}
{:else}
    <span class="font-medium {attacks >= 7 ? 'text-green-400' : 'text-red-400'}">{attacks}/7</span>
{/if}
