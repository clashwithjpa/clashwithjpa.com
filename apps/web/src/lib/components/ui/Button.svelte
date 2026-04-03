<script lang="ts">
    import { cn } from "$lib/utils";
    import { bounceDown, bounceUp } from "$lib/utils/animations";
    import type { Snippet } from "svelte";
    import type { HTMLAttributes } from "svelte/elements";
    import Tooltip from "./Tooltip.svelte";

    let {
        children,
        onclick,
        href = "",
        target = "",
        class: className = "",
        disabled = false,
        tooltip = "",
        animateClick = true,
        tooltipPlacement = "left",
        variant = "base",
        size = "base",
        type = "button",
        ...restProps
    }: {
        children: Snippet;
        onclick?: (e: MouseEvent) => void;
        href?: string;
        target?: string;
        class?: string;
        disabled?: boolean;
        tooltip?: string;
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
        variant?: "base" | "ghost" | "success" | "danger" | null;
        size?: "sm" | "base" | "lg" | "icon" | "";
        type?: string;
    } & HTMLAttributes<HTMLElement> = $props();

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
        base: "bg-stone-800 border-stone-700/50 text-stone-200 not-disabled:hover:bg-stone-700 not-disabled:hover:text-stone-50",
        ghost: "bg-stone-900 border-stone-700/50 text-stone-200 not-disabled:hover:bg-stone-700 not-disabled:hover:text-stone-50",
        success: "bg-green-900 border-green-700/50 text-green-200 not-disabled:hover:bg-green-700 not-disabled:hover:text-green-50",
        danger: "bg-red-900 border-red-700/50 text-red-200 not-disabled:hover:bg-red-700 not-disabled:hover:text-red-50",
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
            variant &&
                "flex cursor-pointer items-center justify-center rounded-lg border-2 transition-colors duration-200 outline-none disabled:cursor-not-allowed disabled:opacity-50!",
            variant && variantClasses[variant],
            variant && sizeClasses[size],
            className,
        ),
    );
</script>

{#snippet button()}
    <svelte:element
        this={href && !disabled ? "a" : "button"}
        type={href ? undefined : type}
        role={href && !disabled ? "link" : "button"}
        {disabled}
        href={disabled ? undefined : href}
        {target}
        class={buttonClass}
        onclick={handleClick}
        onpointerdown={handlePointerDown}
        onpointerup={handlePointerUp}
        onpointerleave={handlePointerUp}
        {...restProps}
    >
        {@render children()}
    </svelte:element>
{/snippet}

{#if tooltip}
    <Tooltip title={tooltip} placement={tooltipPlacement}>
        {@render button()}
    </Tooltip>
{:else}
    {@render button()}
{/if}
