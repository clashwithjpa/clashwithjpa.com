<script lang="ts">
    import { Portal } from "@ark-ui/svelte/portal";
    import { Tooltip } from "@ark-ui/svelte/tooltip";
    import { getContext, type Snippet } from "svelte";

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

    const renderInline = getContext<boolean>("render-inline") ?? false;

    let activated = $state(false);
    let open = $state(false);

    function activate() {
        if (disabled || !title) return;
        activated = true;
        requestAnimationFrame(() => {
            if (activated) open = true;
        });
    }
</script>

{#if activated}
    <Tooltip.Root
        {open}
        onOpenChange={(e) => (open = e.open)}
        openDelay={200}
        interactive={false}
        closeOnPointerDown={true}
        positioning={{ placement, gutter: 12 }}
    >
        <Tooltip.Trigger {disabled} aria-label={title} class={className} onclick={handleClick}>
            {@render children()}
        </Tooltip.Trigger>
        <Portal disabled={renderInline}>
            <Tooltip.Positioner class="z-60">
                <Tooltip.Content
                    style="--arrow-background: var(--color-stone-900); --arrow-size: 12px;"
                    class="rounded-lg border-2 border-stone-700/50 bg-stone-900 px-4 py-2 text-sm text-stone-200 shadow-[0_0_15px_rgba(0,0,0,0.5)] data-[state=closed]:animate-[tooltip-fade-out_150ms_ease] data-[state=open]:animate-[tooltip-fade-in_150ms_ease]"
                >
                    <Tooltip.Arrow>
                        <Tooltip.ArrowTip class="border-t-2 border-l-2 border-stone-700/50" />
                    </Tooltip.Arrow>
                    {title}
                </Tooltip.Content>
            </Tooltip.Positioner>
        </Portal>
    </Tooltip.Root>
{:else}
    <button type="button" {disabled} aria-label={title} class={className} onclick={handleClick} onpointerenter={activate}>
        {@render children()}
    </button>
{/if}

<style>
    :global {
        @keyframes tooltip-fade-in {
            from {
                opacity: 0;
            }
        }
        @keyframes tooltip-fade-out {
            to {
                opacity: 0;
            }
        }
    }
</style>
