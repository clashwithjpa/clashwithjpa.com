<script lang="ts">
    let { value, loading = false }: { value: string | null | undefined; loading?: boolean } = $props();
</script>

{#if loading && !value}
    <span class="block h-3.5 w-20 animate-pulse rounded bg-stone-700/60"></span>
{:else}
    <span class="block truncate">{value ?? "—"}</span>
{/if}
