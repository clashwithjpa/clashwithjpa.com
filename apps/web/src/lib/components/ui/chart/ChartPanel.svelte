<script lang="ts">
    import { cn } from "#lib/utils.js";
    import type { Snippet } from "svelte";

    let {
        title,
        subtitle,
        class: className = "",
        children,
    }: { title: string; subtitle?: string | null; class?: string; children: Snippet } = $props();
</script>

<div class={cn("flex h-full w-full flex-col gap-2", className)}>
    <div class="text-center">
        <h3 class="text-sm font-bold text-stone-200">{title}</h3>
        {#if subtitle}
            <p class="text-xs text-stone-400">{subtitle}</p>
        {/if}
    </div>
    <div class="min-h-0 flex-1">
        {@render children()}
    </div>
</div>
