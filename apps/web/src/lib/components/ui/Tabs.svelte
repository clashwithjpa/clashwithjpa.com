<script lang="ts" generics="T extends string">
    import { cn } from "$lib/utils";

    let {
        options,
        value = $bindable(),
        label,
        class: className = "",
    }: {
        options: { key: T; label: string }[];
        value: T;
        label: string;
        class?: string;
    } = $props();

    let track: HTMLDivElement | undefined = $state();
    const buttons: Record<string, HTMLElement> = $state({});
    let bar = $state<{ x: number; w: number } | null>(null);
    // The underline only animates after its first placement, so it doesn't slide in from the left edge on load.
    let settled = $state(false);

    function measure() {
        const active = buttons[value];
        bar = active ? { x: active.offsetLeft, w: active.offsetWidth } : null;
    }

    $effect(() => {
        void value;
        void options.length;
        measure();
    });

    // The details panel is resizable, so the underline follows the tab widths.
    $effect(() => {
        if (!track) return;
        const observer = new ResizeObserver(measure);
        observer.observe(track);
        const frame = requestAnimationFrame(() => (settled = true));
        return () => {
            observer.disconnect();
            cancelAnimationFrame(frame);
        };
    });
</script>

<div bind:this={track} class={cn("relative flex gap-1 border-b border-stone-700/50", className)} role="tablist" aria-label={label}>
    {#each options as option (option.key)}
        <button
            bind:this={buttons[option.key]}
            type="button"
            role="tab"
            aria-selected={value === option.key}
            onclick={() => (value = option.key)}
            class={cn(
                "flex-1 cursor-pointer px-2 pt-2 pb-2.5 text-sm font-medium transition-colors duration-200",
                value === option.key ? "text-stone-50" : "text-stone-400 hover:text-stone-200",
            )}
        >
            {option.label}
        </button>
    {/each}
    {#if bar}
        <span
            class={cn("pointer-events-none absolute bottom-0 left-0 h-0.5 rounded-full bg-stone-50", settled && "tab-bar-slide")}
            style="width: {bar.w}px; transform: translateX({bar.x}px)"
            aria-hidden="true"
        ></span>
    {/if}
</div>

<style>
    .tab-bar-slide {
        transition:
            transform 250ms var(--ease-glide),
            width 250ms var(--ease-glide);
    }

    @media (prefers-reduced-motion: reduce) {
        .tab-bar-slide {
            transition: none;
        }
    }
</style>
