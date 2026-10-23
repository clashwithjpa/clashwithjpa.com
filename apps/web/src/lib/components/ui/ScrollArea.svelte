<script lang="ts">
    import { cn } from "$lib/utils";
    import type { Snippet } from "svelte";
    import type { HTMLAttributes } from "svelte/elements";
    import OverlayScrollbar from "./OverlayScrollbar.svelte";

    interface Props extends HTMLAttributes<HTMLDivElement> {
        /** Classes for the outer box, which sizes the area in its parent layout. */
        wrapperClass?: string;
        viewport?: HTMLDivElement | null;
        children: Snippet;
    }

    let { wrapperClass, viewport = $bindable(null), class: className, children, ...rest }: Props = $props();
</script>

<div class={cn("relative min-h-0 min-w-0", wrapperClass)}>
    <div bind:this={viewport} class={cn("overflow-auto", className)} {...rest}>
        {@render children()}
    </div>
    <OverlayScrollbar {viewport} />
</div>
