<script lang="ts" generics="T extends string">
    import { cn } from "$lib/utils";

    let {
        options,
        value = $bindable(),
        label,
        class: className = "",
    }: {
        // Options with an href render as page links instead of radio buttons.
        options: { key: T; label: string; href?: string }[];
        value?: T;
        label: string;
        class?: string;
    } = $props();

    let track: HTMLDivElement | undefined = $state();
    const buttons: Record<string, HTMLElement> = $state({});
    const isNav = $derived(options.some((o) => o.href));
    let pill = $state<{ x: number; w: number } | null>(null);
    // The pill only animates after its first placement, so it doesn't slide in from the left edge on load.
    let settled = $state(false);

    function measure() {
        const active = value ? buttons[value] : undefined;
        pill = active ? { x: active.offsetLeft, w: active.offsetWidth } : null;
    }

    $effect(() => {
        void value;
        measure();
    });

    // Tab widths change with the viewport and once the CoC font loads, so the pill follows them.
    $effect(() => {
        if (!track) return;
        const observer = new ResizeObserver(measure);
        observer.observe(track);
        Object.values(buttons).forEach((b) => observer.observe(b));
        const frame = requestAnimationFrame(() => (settled = true));
        return () => {
            observer.disconnect();
            cancelAnimationFrame(frame);
        };
    });
</script>

<div
    bind:this={track}
    class={cn("relative flex rounded-xl border-2 border-black bg-black/40 p-1", className)}
    role={isNav ? undefined : "radiogroup"}
    aria-label={label}
>
    {#if pill}
        <span
            class={cn(
                "pointer-events-none absolute inset-y-1 left-0 rounded-lg bg-linear-to-b from-[#ffcd6a] to-[#e68e2e] shadow-[0_0_0_1px_#000,inset_0_2px_0_rgba(255,255,255,0.4)]",
                settled && "tab-pill-slide",
            )}
            style="width: {pill.w}px; transform: translateX({pill.x}px)"
            aria-hidden="true"
        ></span>
    {/if}
    {#each options as option (option.key)}
        <svelte:element
            this={option.href ? "a" : "button"}
            bind:this={buttons[option.key]}
            href={option.href}
            type={option.href ? undefined : "button"}
            role={option.href ? undefined : "radio"}
            aria-checked={option.href ? undefined : value === option.key}
            aria-current={option.href && value === option.key ? "page" : undefined}
            onclick={option.href ? undefined : () => (value = option.key)}
            class={cn(
                "relative flex h-7 min-w-0 flex-auto cursor-pointer items-center justify-center rounded-lg px-3 font-coc text-sm font-bold whitespace-nowrap transition-[color,text-shadow] duration-200 md:flex-none",
                value === option.key ? "text-white text-outline" : "text-parchment/70 hover:text-white",
            )}
        >
            {option.label}
        </svelte:element>
    {/each}
</div>

<style>
    .tab-pill-slide {
        transition:
            transform 250ms var(--ease-glide),
            width 250ms var(--ease-glide);
    }

    @media (prefers-reduced-motion: reduce) {
        .tab-pill-slide {
            transition: none;
        }
    }
</style>
