<script lang="ts">
    import type { Snippet } from "svelte";

    import { bounds, BoundsFrom, draggable, events } from "@neodrag/svelte";

    interface Props {
        children: Snippet;
        onDragStart?: () => void;
        onDragEnd?: () => void;
    }
    let { children, onDragStart, onDragEnd }: Props = $props();
</script>

<div class="pointer-events-none absolute inset-0 z-10 flex items-end justify-center overflow-hidden pb-6">
    <div
        {@attach draggable([bounds(BoundsFrom.parent()), events({ onDragStart, onDragEnd })])}
        class="pointer-events-auto flex cursor-grab items-center gap-2 rounded-xl bg-stone-900 p-2 drop-shadow-2xl active:cursor-grabbing"
    >
        {@render children()}
    </div>
</div>
