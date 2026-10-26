<script lang="ts">
    import Badge from "#lib/components/ui/Badge.svelte";
    import RawPopup from "#lib/components/ui/RawPopup.svelte";

    type Season = { id: number; name: string };

    let {
        seasons,
        awarded,
        onToggle,
        limit,
    }: { seasons: Season[]; awarded: number[]; onToggle: (seasonId: number, selected: boolean) => void; limit?: number } = $props();

    let shown = $derived(limit ? seasons.slice(0, limit) : seasons);
    let older = $derived(limit ? seasons.slice(limit) : []);
    let olderAwarded = $derived(older.filter((s) => awarded.includes(s.id)).length);
</script>

{#snippet seasonBadge(s: Season)}
    {@const checked = awarded.includes(s.id)}
    <Badge variant="checkbox" size="button" {checked} content={s.name} onclick={() => onToggle(s.id, !checked)} />
{/snippet}

{#if seasons.length === 0}
    <span class="text-xs text-stone-500">—</span>
{:else}
    <div class="flex items-center gap-1.5">
        {#each shown as s (s.id)}
            {@render seasonBadge(s)}
        {/each}
        {#if older.length > 0}
            <!-- Rows have a fixed height, so older seasons open in a popup instead of growing the cell. -->
            <RawPopup placement="bottom-end" maxWidth="max-w-sm">
                {#snippet trigger()}
                    <span
                        class="flex items-center gap-1 rounded border px-2 py-1 font-rubik text-xs {olderAwarded > 0
                            ? 'border-green-700/50 bg-green-900 text-green-200 hover:bg-green-700 hover:text-green-50'
                            : 'border-stone-700/50 bg-stone-900 text-stone-200 hover:bg-stone-700 hover:text-stone-50'}"
                    >
                        +{older.length} more
                    </span>
                {/snippet}
                <div class="flex flex-col gap-2">
                    <span class="text-xs font-semibold text-stone-400">
                        Older seasons{#if olderAwarded > 0}&nbsp;· {olderAwarded} awarded{/if}
                    </span>
                    <div class="flex flex-wrap gap-1.5">
                        {#each older as s (s.id)}
                            {@render seasonBadge(s)}
                        {/each}
                    </div>
                </div>
            </RawPopup>
        {/if}
    </div>
{/if}
