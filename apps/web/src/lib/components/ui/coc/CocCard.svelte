<script lang="ts">
    import { cn } from "#lib/utils.js";
    import type { Snippet } from "svelte";

    let {
        children,
        class: className = "",
        contentClass = "",
        variant = "plank",
    }: {
        children: Snippet;
        class?: string;
        contentClass?: string;
        variant?: "plank" | "panel";
    } = $props();
</script>

<div
    class={cn(
        "relative flex flex-col overflow-hidden font-coc text-parchment",
        variant === "plank" ? "rounded-2xl coc-plank" : "rounded-[28px] coc-panel",
        className,
    )}
>
    <div class={cn("flex-1", contentClass)}>
        {@render children()}
    </div>
</div>
