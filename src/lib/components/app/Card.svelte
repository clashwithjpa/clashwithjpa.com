<script lang="ts">
    import { cn } from "$lib/utils";
    import type { Snippet } from "svelte";

    interface Props {
        class?: string | undefined;
        containerClassName?: string | undefined;
        isMouseEntered?: boolean;
        children?: Snippet;
    }
    let { class: className = undefined, containerClassName = undefined, isMouseEntered = $bindable(false), children, ...props }: Props = $props();

    let containerRef: HTMLDivElement;

    const handleMouseMove = (e: MouseEvent) => {
        if (!containerRef) return;
        const { left, top, width, height } = containerRef.getBoundingClientRect();
        const x = (e.clientX - left - width / 2) / 15;
        const y = (e.clientY - top - height / 2) / 15;
        containerRef.style.transform = `rotateY(${x}deg) rotateX(${y}deg)`;
    };

    const handleMouseEnter = () => {
        isMouseEntered = true;
        if (!containerRef) return;
    };

    const handleMouseLeave = () => {
        if (!containerRef) return;
        isMouseEntered = false;
        containerRef.style.transform = `rotateY(0deg) rotateX(0deg)`;
    };
</script>

<div class={cn("font-coc flex items-center justify-center", containerClassName)} style="perspective: 1000px;">
    <div
        bind:this={containerRef}
        onmouseenter={handleMouseEnter}
        onmousemove={handleMouseMove}
        onmouseleave={handleMouseLeave}
        class={cn("relative flex items-center justify-center transition-all duration-200 ease-linear", className)}
        style="transform-style: preserve-3d;"
        role="presentation"
    >
        {@render children?.()}
    </div>
</div>
