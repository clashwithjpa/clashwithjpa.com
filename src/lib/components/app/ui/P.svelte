<script lang="ts">
    import { cn } from "$lib/utils/cn";
    import type { Snippet } from "svelte";

    interface Props {
        children: Snippet;
        class?: string;
    }
    let { children, class: className }: Props = $props();
</script>

<div
    class={cn(
        "flex items-center justify-center space-x-1 stroke-gray-950 stroke-[0.5px] shadow-gray-950 drop-shadow-[0_2px_0_var(--tw-shadow-color)]",
        className
    )}
    style="-webkit-text-stroke: 0.6px var(--tw-shadow-color);"
>
    {@render children()}
</div>
