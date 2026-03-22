<script lang="ts">
    import { cn } from "$lib/utils";
    import type { Snippet } from "svelte";

    let {
        children,
        class: className = "",
        contentClass = "",
        variant = "default",
    }: {
        children: Snippet;
        class?: string;
        contentClass?: string;
        variant?: "default" | "dark";
    } = $props();

    const variants = {
        default: {
            bg: "from-[#dcb897] via-[#9e5f37] to-[#3b1d0d]",
            overlay: "from-[#bd7a50] to-[#713f21]",
            gloss: "from-[#f2d0b5] to-[rgba(158,95,55,0.7)]",
        },
        dark: {
            bg: "from-[#8b7355] via-[#5a3d2b] to-[#2a1810]",
            overlay: "from-[#6b4d38] to-[#4a2f1e]",
            gloss: "from-[#a08570] to-[rgba(90,61,43,0.7)]",
        },
    };

    const v = $derived(variants[variant]);
    const contentBg = "from-[#e4cca3] to-[#c7ad85]";
</script>

<div
    class={cn(
        "relative overflow-hidden rounded-[20px] border border-black shadow-[0_0_0_1px_#000,0_0_0_2px_#000,0_8px_16px_rgba(0,0,0,0.4)]",
        className,
    )}
>
    <span class={`absolute inset-0 bg-linear-to-b ${v.bg}`}></span>
    <span class={`absolute inset-0.5 rounded-[18px] bg-linear-to-b ${v.overlay} opacity-80`}></span>
    <span class={`absolute inset-x-1.5 top-1.5 h-1/2 rounded-[14px] rounded-b-xl bg-linear-to-b ${v.gloss} opacity-70`}></span>

    <div class="relative h-full">
        <div
            class={cn(
                `m-2 overflow-hidden rounded-xl border border-black bg-linear-to-b font-coc ${contentBg} shadow-[0_0_0_1px_#000,inset_0_2px_4px_rgba(255,255,255,0.4)]`,
                contentClass,
            )}
        >
            {@render children()}
        </div>
    </div>
</div>
