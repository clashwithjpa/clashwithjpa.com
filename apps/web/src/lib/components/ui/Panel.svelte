<script lang="ts">
    import { cn } from "$lib/utils";
    import type { Snippet } from "svelte";

    let {
        title,
        subtitle,
        subtitleLoading = false,
        actions,
        class: className = "",
        children,
    }: {
        title: string;
        subtitle?: string | null;
        // Keeps the header at its loaded height while the subtitle's numbers load.
        subtitleLoading?: boolean;
        actions?: Snippet;
        class?: string;
        children: Snippet;
    } = $props();
</script>

<section class={cn("flex min-w-0 flex-col gap-4 rounded-lg border-2 border-stone-700/50 bg-stone-900 p-4", className)}>
    <header class="flex min-h-8 items-center justify-between gap-3">
        <div class="min-w-0">
            <h2 class="truncate text-sm font-bold text-stone-100">{title}</h2>
            {#if subtitleLoading}
                <p class="flex h-4 items-center"><span class="h-3 w-32 skeleton"></span></p>
            {:else if subtitle}
                <p class="truncate text-xs text-stone-400">{subtitle}</p>
            {/if}
        </div>
        {#if actions}
            <div class="flex shrink-0 items-center gap-2">{@render actions()}</div>
        {/if}
    </header>
    <div class="flex min-h-0 flex-1 flex-col">
        {@render children()}
    </div>
</section>
