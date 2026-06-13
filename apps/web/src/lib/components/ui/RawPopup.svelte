<script lang="ts">
    import { cn } from "$lib/utils";
    import { Popover } from "@ark-ui/svelte/popover";
    import { Portal } from "@ark-ui/svelte/portal";
    import { getContext, type Snippet } from "svelte";

    let {
        trigger,
        children,
        placement = "bottom",
        open = $bindable(false),
        class: className = "",
        contentClass = "",
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
        maxWidth?: string;
        onOpenChange?: (details: Popover.OpenChangeDetails) => void;
    } = $props();

    // When rendered inside a Dialog (which sets this context), portaling to <body>
    // would place the popover at z-60, below the dialog's z-9999 backdrop. Render
    // inline instead so the popover lives inside the dialog's stacking context.
    const renderInline = getContext<boolean>("tooltip-render-inline") ?? false;
</script>

<Popover.Root
    bind:open
    {onOpenChange}
    positioning={{ placement, offset: { mainAxis: 16, crossAxis: 0 } }}
    closeOnInteractOutside={true}
    autoFocus={false}
    immediate={true}
    unmountOnExit={true}
    skipAnimationOnMount={true}
>
    <Popover.Trigger class={cn("cursor-pointer border-none bg-transparent outline-none", className)}>
        {@render trigger()}
    </Popover.Trigger>

    <Portal disabled={renderInline}>
        <Popover.Positioner class={cn(renderInline ? "z-9999" : "z-60")}>
            <Popover.Content
                class={cn(
                    "transition-all duration-200 outline-none data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95",
                    "flex max-h-[calc(var(--available-height)-1rem)] flex-col overflow-x-hidden overflow-y-auto rounded-lg border-2 border-stone-700/50 bg-stone-900 p-4 shadow-2xl",
                    "[-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
                    maxWidth,
                    contentClass,
                )}
            >
                {@render children()}
            </Popover.Content>
        </Popover.Positioner>
    </Portal>
</Popover.Root>
