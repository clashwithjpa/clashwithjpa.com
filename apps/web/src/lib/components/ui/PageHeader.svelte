<script lang="ts">
    import { cn } from "#lib/utils.js";
    import type { Snippet } from "svelte";

    let {
        title,
        subtitle,
        subtitleLoading = false,
        actions,
        class: className = "",
    }: {
        title: string;
        subtitle?: string | Snippet;
        // Holds the subtitle's place while its numbers load, so it never shows a stale count.
        subtitleLoading?: boolean;
        // Controls sit beside the title once the header itself is wide enough (a
        // container query, so the sidebar is accounted for) and wrap rather than
        // overflow. Children can use @md:/@3xl: variants against the header width.
        actions?: Snippet;
        class?: string;
    } = $props();
</script>

<header class={cn("@container", className)}>
    <div class="flex flex-col gap-3 @4xl:flex-row @4xl:items-center @4xl:justify-between @4xl:gap-6">
        <div class="min-w-0 @4xl:shrink-0">
            <h1 class="truncate text-2xl font-bold">{title}</h1>
            {#if subtitleLoading}
                <p class="flex h-5 items-center"><span class="h-3 w-36 skeleton"></span></p>
            {:else if typeof subtitle === "string"}
                <p class="text-sm text-stone-400">{subtitle}</p>
            {:else if subtitle}
                <p class="text-sm text-stone-400">{@render subtitle()}</p>
            {/if}
        </div>
        {#if actions}
            <div class="flex min-w-0 flex-wrap items-center gap-2 @4xl:flex-1 @4xl:justify-end">
                {@render actions()}
            </div>
        {/if}
    </div>
</header>
