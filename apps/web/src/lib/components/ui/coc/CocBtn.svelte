<script lang="ts">
    import { cn } from "$lib/utils";
    import type { Snippet } from "svelte";

    let {
        href = "",
        target = "",
        variant = "green",
        size = "base",
        class: className = "",
        onclick = undefined,
        children,
    }: {
        href?: string;
        target?: string;
        variant?: "green" | "orange" | "red" | "blurple";
        size?: "xs" | "sm" | "base" | "lg";
        class?: string;
        onclick?: () => void;
        children: Snippet;
    } = $props();

    const variants = {
        green: {
            bg: "from-[#d3ebb7] via-[#85c03f] to-[#366c1b]",
            overlay: "from-[#7fc427] to-[#58a221]",
            gloss: "from-[#d0e878] to-[rgba(152,208,64,0.73)]",
        },
        orange: {
            bg: "from-[#ffdc9f] via-[#ffa92b] to-[#a94908]",
            overlay: "from-[#ffcd6a] to-[#e68e2e]",
            gloss: "from-[#ffe6a5] to-[rgba(255,147,0,0.7)]",
        },
        red: {
            bg: "from-[#ffb3b3] via-[#ff4c4c] to-[#a80000]",
            overlay: "from-[#ff7575] to-[#d50000]",
            gloss: "from-[#ff9b9b] to-[rgba(199,0,0,0.7)]",
        },
        blurple: {
            bg: "from-[#b5bbf9] via-[#5865f2] to-[#2033b0]",
            overlay: "from-[#7b87f6] to-[#4754e0]",
            gloss: "from-[#a5acf8] to-[rgba(88,101,242,0.7)]",
        },
    };

    // One fixed scale, the same at every breakpoint: pick the size for the job, not the screen.
    const sizes = {
        xs: "h-8 px-3 text-xs",
        sm: "h-10 px-4 text-sm",
        base: "h-12 px-6 text-base",
        lg: "h-14 px-8 text-lg",
    };

    const v = $derived(variants[variant] ?? variants.green);
    const sizeClasses = $derived(sizes[size] ?? sizes.base);
</script>

<svelte:element
    this={href ? "a" : "button"}
    {href}
    {target}
    role={href ? "link" : "button"}
    class={cn(
        "press relative inline-flex cursor-pointer items-center justify-center overflow-hidden rounded-xl border border-black font-coc leading-none font-bold tracking-wide whitespace-nowrap text-white shadow-[0_0_0_1px_#000,0_0_0_2px_#000,0_4px_0_2px_rgba(0,0,0,0.2)] select-none",
        sizeClasses,
        className,
    )}
    onclick={() => {
        onclick?.();
    }}
>
    <span class={`absolute inset-0 bg-linear-to-b ${v.bg}`}></span>
    <span class={`absolute inset-0.5 rounded-[10px] bg-linear-to-b ${v.overlay} opacity-80`}></span>
    <span class={`absolute inset-x-1.5 top-1.5 h-1/2 rounded-lg bg-linear-to-b ${v.gloss} opacity-70`}></span>
    <span class="text-shadow relative flex items-center gap-2 px-1.25">{@render children()}</span>
</svelte:element>

<style>
    /* In em so the outline keeps the same weight relative to the text at every size. */
    .text-shadow {
        text-shadow:
            0 -0.125em #000,
            0 0 #000,
            0 0.125em #000,
            0 0.25em #000,
            -0.0625em -0.0625em #000,
            0.0625em -0.0625em #000,
            0.0625em 0 #000,
            -0.0625em 0 #000,
            0.0625em 0.0625em #000,
            -0.0625em 0.0625em #000,
            0.0625em 0.125em #000,
            -0.0625em 0.125em #000;
    }

    .text-shadow :global(svg) {
        filter: drop-shadow(0 -0.125em #000) drop-shadow(0 0.125em #000) drop-shadow(0.0625em 0 #000) drop-shadow(-0.0625em 0 #000)
            drop-shadow(0 0.25em #000);
        flex-shrink: 0;
    }
</style>
