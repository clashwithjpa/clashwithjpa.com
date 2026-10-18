<script lang="ts">
    import { cn } from "$lib/utils";
    import type { Snippet } from "svelte";

    // Shared layout for single-line activities, so every pill lines up the same.
    let {
        lead,
        title,
        subtitle,
        trail,
        class: className = "",
    }: { lead?: Snippet; title: string; subtitle?: string; trail?: Snippet; class?: string } = $props();
</script>

<div class={cn("flex min-h-14 items-center gap-3 py-2 pr-5 pl-3", className)}>
    {#if lead}
        <div class="grid size-8 shrink-0 place-items-center rounded-full">{@render lead()}</div>
    {/if}
    <div class="flex max-w-64 min-w-0 flex-col">
        <span class="line-clamp-2 text-sm leading-snug font-medium text-stone-50">{title}</span>
        {#if subtitle}
            <span class="line-clamp-2 text-xs text-stone-400">{subtitle}</span>
        {/if}
    </div>
    {#if trail}
        <div class="ml-auto flex shrink-0 items-center pl-2">{@render trail()}</div>
    {/if}
</div>
