<script lang="ts">
    import { cn } from "$lib/utils";
    import { Draggable } from "@neodrag/svelte";
    import type { Snippet } from "svelte";

    interface Props {
        children: Snippet;
        onDragStart?: () => void;
        onDragEnd?: () => void;
        class?: string;
    }
    let { children, onDragStart, onDragEnd, class: className = "" }: Props = $props();

    const drag = new Draggable({
        bounds: "parent",
        get onDragStart() {
            return onDragStart;
        },
        get onDragEnd() {
            return onDragEnd;
        },
    });
</script>

<div class="pointer-events-none absolute inset-0 z-10 flex items-end justify-center overflow-hidden px-4 pb-6">
    <div
        {...drag.attach}
        class={cn(
            "pointer-events-auto flex max-w-full cursor-grab items-center justify-center gap-2 rounded-xl bg-stone-900 p-2 drop-shadow-2xl active:cursor-grabbing",
            className,
        )}
    >
        {@render children()}
    </div>
</div>
