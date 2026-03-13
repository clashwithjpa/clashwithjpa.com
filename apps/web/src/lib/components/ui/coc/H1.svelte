<script lang="ts">
    import { cn } from "$lib/utils";
    import type { Snippet } from "svelte";

    interface Props {
        class?: string;
        children: Snippet;
    }
    let { class: className = "", children }: Props = $props();
</script>

<h1
    class={cn(
        "font-coc font-extrabold shadow-stone-900 drop-shadow-[0_2px_0_var(--tw-shadow-color)] md:drop-shadow-[0_6px_0_var(--tw-shadow-color)]",
        className,
    )}
    style="-webkit-text-stroke: 2px var(--tw-shadow-color);"
>
    {@render children()}
</h1>
