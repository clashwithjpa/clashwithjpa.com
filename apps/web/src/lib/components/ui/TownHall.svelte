<script lang="ts" module>
    export const townHallUrl = (level: number) => `https://assets.clashk.ing/buildings/home-village/town_hall/level_${level}.webp`;
</script>

<script lang="ts">
    import { cn } from "#lib/utils.js";

    let { level, class: className = "" }: { level: number | null | undefined; class?: string } = $props();

    // Remembers which level failed, so a later level change gets a fresh attempt.
    let failedLevel = $state<number | null>(null);
    const failed = $derived(!level || failedLevel === level);
</script>

{#if failed}
    <div
        class={cn("@container grid size-full shrink-0 place-items-center rounded-md bg-black/40", className)}
        title={level ? `Town Hall ${level}` : undefined}
    >
        <span class="text-[30cqw] leading-none font-bold text-white/80">TH{level || "?"}</span>
    </div>
{:else}
    <img
        src={townHallUrl(level!)}
        alt="Town Hall {level}"
        class={cn("size-full shrink-0 object-contain", className)}
        loading="lazy"
        onerror={() => (failedLevel = level ?? null)}
    />
{/if}
