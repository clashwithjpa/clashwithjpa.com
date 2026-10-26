<script lang="ts">
    import { cn } from "#lib/utils.js";

    // Mirrors SessionCard and ApiKeyCard row for row, so the swap to real content doesn't shift.
    let { variant, class: className = "" }: { variant: "session" | "apiKey"; class?: string } = $props();
</script>

<div class={cn("flex h-full min-h-40 min-w-0 flex-col gap-4 rounded-lg border-2 border-stone-700/50 bg-stone-900 p-4", className)} aria-hidden="true">
    <div class="flex items-start justify-between gap-4">
        <div class="flex min-w-0 flex-1 flex-col gap-1">
            <div class="flex h-7 items-center gap-2">
                {#if variant === "session"}
                    <div class="size-6 shrink-0 skeleton rounded-md"></div>
                    <div class="h-4.5 w-16 skeleton"></div>
                    <div class="size-6 shrink-0 skeleton rounded-full"></div>
                    <div class="h-4.5 w-20 skeleton"></div>
                {:else}
                    <div class="h-4.5 w-3/5 skeleton"></div>
                {/if}
            </div>
            <div class="flex h-4 items-center"><div class="h-3 w-4/5 skeleton"></div></div>
        </div>
        {#if variant === "apiKey"}
            <div class="h-5 w-14 shrink-0 skeleton rounded-full"></div>
        {/if}
    </div>

    {#if variant === "apiKey"}
        <div class="flex gap-2">
            <div class="h-5.5 w-16 skeleton rounded-full"></div>
            <div class="h-5.5 w-14 skeleton rounded-full"></div>
        </div>
    {/if}

    <hr class="border-stone-700/50" />

    <div class="flex flex-col gap-2">
        {#each [24, 20, 28] as label, i (i)}
            <div class="flex h-5 items-center justify-between gap-2">
                <div class="flex items-center gap-1">
                    <div class="size-4 skeleton rounded"></div>
                    <div class="h-3.5 skeleton" style:width="{label * 0.25}rem"></div>
                </div>
                <div class="h-3.5 w-20 skeleton"></div>
            </div>
        {/each}
    </div>

    <div class="mt-auto flex gap-2 pt-2">
        <div class="h-10 flex-1 skeleton rounded-lg"></div>
        {#if variant === "apiKey"}
            <div class="h-10 flex-1 skeleton rounded-lg"></div>
        {/if}
    </div>
</div>
