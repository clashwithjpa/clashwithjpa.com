<script lang="ts">
    import { cn } from "#lib/utils.js";

    let { class: className = "" }: { class?: string } = $props();
</script>

<!-- 1em by default so it drops into the same slot as an icon. -->
<svg class={cn("size-[1em] shrink-0 animate-[spin_0.7s_linear_infinite]", className)} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="3" opacity="0.2" />
    <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" stroke-width="3" stroke-linecap="round" />
</svg>
