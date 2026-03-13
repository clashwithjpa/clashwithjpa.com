<script lang="ts">
    import { bounceDown, bounceUp } from "$lib/utils/animations";
    import type { Snippet } from "svelte";

    let {
        href = "#",
        variant = "green",
        size = "base",
        class: className = "",
        onclick = undefined,
        children,
    }: {
        href?: string;
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

    const sizes = {
        xs: "text-xs px-4 py-2 md:text-sm md:px-5 md:py-3",
        sm: "text-sm px-5 py-3 md:text-base md:px-6 md:py-4",
        base: "text-base px-6 py-4",
        lg: "text-lg px-7 py-5 md:text-xl md:px-8 md:py-6",
    };

    const v = $derived(variants[variant] ?? variants.green);
    const sizeClasses = $derived(sizes[size] ?? sizes.base);

    let isPressed = false;
</script>

<a
    {href}
    class={`relative inline-flex cursor-pointer items-center justify-center overflow-hidden rounded-xl border border-black leading-[1.2] font-bold tracking-wide text-white uppercase shadow-[0_0_0_1px_#000,0_0_0_2px_#000,0_4px_0_2px_rgba(0,0,0,0.2)] select-none ${sizeClasses} ${className}`}
    onpointerdown={(e) => {
        isPressed = true;
        bounceDown(e.currentTarget as Element);
    }}
    onpointerup={(e) => {
        if (isPressed) {
            isPressed = false;
            bounceUp(e.currentTarget as Element);
        }
    }}
    onpointerleave={(e) => {
        if (isPressed) {
            isPressed = false;
            bounceUp(e.currentTarget as Element);
        }
    }}
    onclick={(e) => {
        onclick?.();
    }}
>
    <span class={`absolute inset-0 bg-linear-to-b ${v.bg}`}></span>
    <span class={`absolute inset-0.5 rounded-[10px] bg-linear-to-b ${v.overlay} opacity-80`}></span>
    <span class={`absolute inset-x-1.5 top-1.5 h-1/2 rounded-lg bg-linear-to-b ${v.gloss} opacity-70`}></span>
    <span class="text-shadow relative flex items-center gap-2 px-1.25">{@render children()}</span>
</a>

<style>
    .text-shadow {
        text-shadow:
            0 -2px #000,
            0 0 #000,
            0 2px #000,
            0 4px #000,
            -1px -1px #000,
            1px -1px #000,
            1px 0 #000,
            -1px 0 #000,
            1px 1px #000,
            -1px 1px #000,
            1px 2px #000,
            -1px 2px #000;
    }

    .text-shadow :global(svg) {
        filter: drop-shadow(0 -2px #000) drop-shadow(0 2px #000) drop-shadow(1px 0 #000) drop-shadow(-1px 0 #000) drop-shadow(0 4px #000);
        flex-shrink: 0;
    }
</style>
