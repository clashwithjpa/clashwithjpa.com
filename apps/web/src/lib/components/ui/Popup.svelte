<script lang="ts">
    import MobileDrawer from "$lib/components/ui/mobile/Drawer.svelte";
    import { cn } from "$lib/utils";
    import { createMobileMediaQuery } from "$lib/utils/mobile";
    import { onMount, type Snippet } from "svelte";
    import RawPopup from "./RawPopup.svelte";

    let {
        trigger,
        children,
        placement = "bottom",
        open = $bindable(false),
        class: className = "",
        contentClass = "",
        title = "",
        maxWidth = "max-w-96",
        onOpenChange,
    }: {
        trigger: Snippet;
        children: Snippet;
        placement?:
            | "top"
            | "top-start"
            | "top-end"
            | "bottom"
            | "bottom-start"
            | "bottom-end"
            | "left"
            | "left-start"
            | "left-end"
            | "right"
            | "right-start"
            | "right-end";
        open?: boolean;
        class?: string;
        contentClass?: string;
        title?: string;
        onOpenChange?: (details: { open: boolean }) => void;
        maxWidth?: string;
    } = $props();

    let isMobile = $state(false);

    onMount(() => {
        const cleanup = createMobileMediaQuery((mobile) => {
            isMobile = mobile;
        });
        return cleanup;
    });
</script>

{#if isMobile}
    <MobileDrawer bind:open {title} onClose={() => onOpenChange?.({ open: false })}>
        {#snippet trigger()}
            <div class={cn("cursor-pointer border-none bg-transparent outline-none", className)}>
                {@render trigger?.()}
            </div>
        {/snippet}
        <div class={contentClass}>
            {@render children()}
        </div>
    </MobileDrawer>
{:else}
    <RawPopup {trigger} {children} {placement} bind:open class={className} {contentClass} {maxWidth} {onOpenChange} />
{/if}
