<script lang="ts">
    import MobileDrawer from "$lib/components/ui/mobile/Drawer.svelte";
    import { cn } from "$lib/utils";
    import { createMobileMediaQuery } from "$lib/utils/mobile";
    import { Popover } from "@ark-ui/svelte/popover";
    import { Portal } from "@ark-ui/svelte/portal";
    import { onMount, type Snippet } from "svelte";

    let {
        trigger,
        children,
        placement = "bottom",
        open = $bindable(false),
        class: className = "",
        contentClass = "",
        title = "",
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
                {@render trigger()}
            </div>
        {/snippet}
        <div class={cn("pt-2", contentClass)}>
            {@render children()}
        </div>
    </MobileDrawer>
{:else}
    <Popover.Root bind:open positioning={{ placement, offset: { mainAxis: 16, crossAxis: 0 } }} {onOpenChange}>
        <Popover.Trigger class={cn("cursor-pointer border-none bg-transparent outline-none", className)}>
            {@render trigger()}
        </Popover.Trigger>

        <Portal>
            <Popover.Positioner class="z-60">
                <Popover.Content
                    class={cn(
                        "transition-all duration-200 outline-none data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95",
                        "rounded-lg border-2 border-stone-700/50 bg-stone-900 p-4 shadow-2xl",
                        contentClass,
                    )}
                >
                    {@render children()}
                </Popover.Content>
            </Popover.Positioner>
        </Portal>
    </Popover.Root>
{/if}
