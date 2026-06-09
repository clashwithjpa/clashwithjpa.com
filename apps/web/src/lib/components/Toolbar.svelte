<script lang="ts">
    import { cn } from "$lib/utils";
    import type { Snippet } from "svelte";

    import { bounds, BoundsFrom, draggable, events } from "@neodrag/svelte";

    interface Props {
        children: Snippet;
        onDragStart?: () => void;
        onDragEnd?: () => void;
        class?: string;
    }
    let { children, onDragStart, onDragEnd, class: className = "" }: Props = $props();
</script>

<div class="pointer-events-none absolute inset-0 z-10 flex items-end justify-center overflow-hidden px-4 pb-6">
    <div
        {@attach draggable([bounds(BoundsFrom.parent()), events({ onDragStart, onDragEnd })])}
        class={cn(
            "pointer-events-auto flex max-w-full cursor-grab items-center justify-center gap-2 rounded-xl bg-stone-900 p-2 drop-shadow-2xl active:cursor-grabbing",
            className,
        )}
    >
        {@render children()}
    </div>
</div>
