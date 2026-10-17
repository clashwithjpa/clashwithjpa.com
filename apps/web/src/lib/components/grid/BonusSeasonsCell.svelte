<script lang="ts">
    import Badge from "$lib/components/ui/Badge.svelte";

    type Season = { id: number; name: string };

    let { seasons, awarded, onToggle }: { seasons: Season[]; awarded: number[]; onToggle: (seasonId: number, selected: boolean) => void } = $props();
</script>

{#if seasons.length === 0}
    <span class="text-xs text-stone-500">—</span>
{:else}
    <div class="flex items-center gap-1.5">
        {#each seasons as s (s.id)}
            {@const checked = awarded.includes(s.id)}
            <Badge variant="checkbox" size="button" {checked} content={s.name} onclick={() => onToggle(s.id, !checked)} />
        {/each}
    </div>
{/if}
