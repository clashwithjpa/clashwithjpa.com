<script lang="ts">
    import Icon from "#lib/components/ui/Icon.svelte";
    import { cn } from "#lib/utils.js";

    // `newStars` of `stars` were new on that base; the rest were already taken by an earlier hit.
    let { stars, newStars = stars, class: className = "size-4" }: { stars: number; newStars?: number; class?: string } = $props();

    const kinds = $derived([0, 1, 2].map((i) => (i < stars - newStars ? "old" : i < stars ? "new" : "none")));
</script>

<span class="inline-flex shrink-0 items-center" role="img" aria-label="{stars} star{stars === 1 ? '' : 's'}, {newStars} new">
    {#each kinds as kind, i (i)}
        <Icon name="star" class={cn(className, kind === "old" && "opacity-45 saturate-50", kind === "none" && "opacity-15 grayscale")} />
    {/each}
</span>
