<script lang="ts">
    import { Portal } from "@ark-ui/svelte/portal";
    import { Tooltip } from "@ark-ui/svelte/tooltip";
    import type { Snippet } from "svelte";

    let {
        children,
        onclick,
        class: className = "",
        disabled = false,
        title = "",
        placement = "left",
    }: {
        children: Snippet;
        onclick?: (e: MouseEvent) => void;
        class?: string;
        disabled?: boolean;
        title?: string;
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
    } = $props();

    function handleClick(e: MouseEvent) {
        if (disabled) return;
        if (onclick) onclick(e);
    }
</script>

<Tooltip.Root openDelay={200} interactive={false} closeOnPointerDown={true} positioning={{ placement, gutter: 12 }}>
    <Tooltip.Trigger {disabled} aria-label={title} class={className} onclick={handleClick}>
        {@render children()}
    </Tooltip.Trigger>
    <Portal>
        <Tooltip.Positioner class="z-60">
            <Tooltip.Content
                style="--arrow-background: var(--color-stone-900); --arrow-size: 12px;"
                class="rounded-lg border-2 border-stone-700/50 bg-stone-900 px-4 py-2 text-sm text-stone-200 shadow-[0_0_15px_rgba(0,0,0,0.5)] transition-all duration-200 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
            >
                <Tooltip.Arrow>
                    <Tooltip.ArrowTip class="border-t-2 border-l-2 border-stone-700/50" />
                </Tooltip.Arrow>
                {title}
            </Tooltip.Content>
        </Tooltip.Positioner>
    </Portal>
</Tooltip.Root>
