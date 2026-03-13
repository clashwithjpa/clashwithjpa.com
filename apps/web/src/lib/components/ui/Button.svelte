<script lang="ts">
    let {
        children,
        onclick,
        class: className = "",
        disabled = false,
        title = "",
        animateClick = true,
        tooltipPlacement = "left",
        variant = "base",
        size = "base",
    }: {
        children: Snippet;
        onclick?: (e: MouseEvent) => void;
        class?: string;
        disabled?: boolean;
        title?: string;
        animateClick?: boolean;
        tooltipPlacement?:
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
        variant?: "base" | "ghost";
        size?: "sm" | "base" | "lg" | "icon" | "";
    } = $props();

    import { cn } from "$lib/utils";
    import { bounceDown, bounceUp } from "$lib/utils/animations";
    import { Portal } from "@ark-ui/svelte/portal";
    import { Tooltip } from "@ark-ui/svelte/tooltip";
    import type { Snippet } from "svelte";

    let isPressed = false;

    function handlePointerDown(e: Event) {
        if (disabled) return;
        isPressed = true;
        if (animateClick) bounceDown(e.currentTarget as Element);
    }

    function handlePointerUp(e: Event) {
        if (disabled) return;
        if (isPressed) {
            isPressed = false;
            if (animateClick) bounceUp(e.currentTarget as Element);
        }
    }

    function handleClick(e: MouseEvent) {
        if (disabled) return;
        if (onclick) onclick(e);
    }

    const variantClasses = {
        base: "bg-stone-800",
        ghost: "bg-stone-900",
    };

    const sizeClasses = {
        "": "",
        sm: "text-sm px-3 py-1.5",
        base: "text-base px-4 py-2",
        lg: "text-lg px-6 py-3",
        icon: "size-10",
    };

    const buttonClass = $derived(
        cn(
            "flex cursor-pointer items-center justify-center rounded-lg border-2 border-stone-700/50 text-stone-200 transition-colors duration-200 outline-none hover:bg-stone-700 hover:text-stone-50 disabled:cursor-not-allowed disabled:opacity-50",
            variantClasses[variant],
            sizeClasses[size],
            className,
        ),
    );
</script>

{#if title}
    <Tooltip.Root openDelay={200} interactive={false} closeOnPointerDown={true} positioning={{ placement: tooltipPlacement, gutter: 12 }}>
        <Tooltip.Trigger
            {disabled}
            aria-label={title}
            class={buttonClass}
            onclick={handleClick}
            onpointerdown={handlePointerDown}
            onpointerup={handlePointerUp}
            onpointerleave={handlePointerUp}
        >
            {@render children()}
        </Tooltip.Trigger>
        <Portal>
            <Tooltip.Positioner class="z-60">
                <Tooltip.Content
                    style="--arrow-background: var(--color-stone-900); --arrow-size: 12px;"
                    class="rounded-lg border-2 border-stone-700/50 bg-stone-900 px-4 py-2 text-xs text-stone-200 shadow-[0_0_15px_rgba(0,0,0,0.5)] transition-all duration-200 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
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
    <button
        type="button"
        {disabled}
        class={buttonClass}
        onclick={handleClick}
        onpointerdown={handlePointerDown}
        onpointerup={handlePointerUp}
        onpointerleave={handlePointerUp}
    >
        {@render children()}
    </button>
{/if}
