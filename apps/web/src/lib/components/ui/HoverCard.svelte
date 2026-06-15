<script lang="ts">
    import { cn } from "$lib/utils";
    import { HoverCard } from "@ark-ui/svelte/hover-card";
    import { Portal } from "@ark-ui/svelte/portal";
    import { getContext, type Snippet } from "svelte";

    let {
        trigger,
        children,
        placement = "top",
        class: className = "",
        contentClass = "",
        maxWidth = "max-w-72",
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
        class?: string;
        contentClass?: string;
        maxWidth?: string;
    } = $props();

    const renderInline = getContext<boolean>("render-inline") ?? false;
</script>

<HoverCard.Root openDelay={150} closeDelay={100} positioning={{ placement, gutter: 12 }}>
    <HoverCard.Trigger class={cn("cursor-pointer border-none bg-transparent outline-none", className)}>
        {@render trigger()}
    </HoverCard.Trigger>

    <Portal disabled={renderInline}>
        <HoverCard.Positioner class={cn(renderInline ? "z-9999" : "z-60")}>
            <HoverCard.Content
                style="--arrow-background: var(--color-stone-900); --arrow-size: 12px;"
                class={cn(
                    "transition-all duration-200 outline-none data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95",
                    "rounded-lg border-2 border-stone-700/50 bg-stone-900 p-4 shadow-2xl",
                    maxWidth,
                    contentClass,
                )}
            >
                <HoverCard.Arrow>
                    <HoverCard.ArrowTip class="border-t-2 border-l-2 border-stone-700/50" />
                </HoverCard.Arrow>
                {@render children()}
            </HoverCard.Content>
        </HoverCard.Positioner>
    </Portal>
</HoverCard.Root>
