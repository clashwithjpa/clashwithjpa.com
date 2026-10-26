<script lang="ts">
    import Ribbon from "#lib/components/ui/coc/Ribbon.svelte";
    import { cn } from "#lib/utils.js";
    import type { Snippet } from "svelte";

    let { label, children, class: className = "" }: { label: string; children: Snippet; class?: string } = $props();
</script>

<div class={cn("relative animate-in rounded-[28px] p-3 pt-12 coc-panel duration-500 fade-in md:p-6 md:pt-14", className)}>
    <Ribbon class="absolute -top-3.5 -left-2 md:-left-3">{label}</Ribbon>
    {@render children()}
</div>
