<script lang="ts">
    import { cn } from "$lib/utils";
    import type { Snippet } from "svelte";

    let { children, class: className = "" }: { children: Snippet; class?: string } = $props();
</script>

<!-- clip-path would cut a border off the notch, so the outline is a drop-shadow on the wrapper. -->
<span class={cn("ribbon-edge inline-flex", className)}>
    <span
        class="ribbon inline-flex items-center bg-linear-to-b from-[#f2604a] via-[#d23624] to-[#a51f14] py-1.5 pr-9 pl-5 font-coc text-sm font-bold tracking-wide whitespace-nowrap text-white text-outline"
    >
        {@render children()}
    </span>
</span>

<style>
    .ribbon-edge {
        filter: drop-shadow(1px 0 #000) drop-shadow(-1px 0 #000) drop-shadow(0 1px #000) drop-shadow(0 -1px #000)
            drop-shadow(0 3px rgba(0, 0, 0, 0.45));
    }

    .ribbon {
        clip-path: polygon(0 0, 100% 0, calc(100% - 0.85rem) 50%, 100% 100%, 0 100%);
        box-shadow:
            inset 0 2px 0 rgba(255, 255, 255, 0.3),
            inset 0 -3px 0 rgba(0, 0, 0, 0.25);
    }
</style>
