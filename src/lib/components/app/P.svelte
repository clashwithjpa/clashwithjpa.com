<script lang="ts">
    import { cn } from "$lib/utils";
    import type { Snippet } from "svelte";

    interface Props {
        children: Snippet;
        class?: string;
    }
    let { children, class: className }: Props = $props();
</script>

<div
    class={cn(
        "font-coc stroke-background shadow-background flex items-center justify-center space-x-1 stroke-[0.5px] drop-shadow-[0_2px_0_var(--tw-shadow-color)]",
        className
    )}
    style="-webkit-text-stroke: 0.6px var(--tw-shadow-color);"
>
    {@render children()}
</div>
