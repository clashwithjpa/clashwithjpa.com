<script lang="ts">
    import { cn } from "$lib/utils.js";
    import { ToggleGroup } from "@ark-ui/svelte/toggle-group";
    import type { Component } from "svelte";
    import Tooltip from "./Tooltip.svelte";

    export type Option = { label?: string; tooltip?: string; value: string; icon?: Component };

    let {
        value = $bindable([]),
        options = [],
        class: className = "",
        contentClass = "",
        disabled = false,
        multiple = false,
        orientation = "horizontal",
        size = "base",
        tooltip = false,
        tooltipPlacement = "top",
    }: {
        value?: string[];
        options: Option[];
        class?: string;
        contentClass?: string;
        disabled?: boolean;
        multiple?: boolean;
        orientation?: "horizontal" | "vertical";
        size?: "sm" | "base" | "lg";
        tooltip?: boolean;
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
    } = $props();

    const sizeClasses = {
        sm: "px-2 py-1 text-xs",
        base: "px-3 py-1.5 text-sm",
        lg: "px-4 py-2 text-base",
    };
</script>

{#snippet toggleItem(option: (typeof options)[number])}
    <ToggleGroup.Item
        value={option.value}
        {disabled}
        class={cn(
            "flex w-full flex-1 cursor-pointer items-center justify-center gap-2 font-medium text-stone-200 transition-colors duration-200 outline-none select-none",
            sizeClasses[size],
            "hover:bg-stone-700! hover:text-stone-50!",
            "data-[state=on]:bg-stone-800 data-[state=on]:text-stone-50",
            "disabled:cursor-not-allowed disabled:opacity-50!",
        )}
    >
        {#if option.icon}
            {@const IconComponent = option.icon}
            <IconComponent class={cn("size-4", contentClass)} />
        {/if}
        {#if option.label}
            <span class={cn(contentClass)}>{option.label}</span>
        {/if}
    </ToggleGroup.Item>
{/snippet}

<ToggleGroup.Root
    bind:value
    {disabled}
    {multiple}
    {orientation}
    class={cn(
        "inline-flex overflow-hidden rounded-lg border-2 border-stone-700/50 bg-stone-900",
        orientation === "vertical" ? "flex-col divide-y-2 divide-stone-700/50" : "flex-row divide-x-2 divide-stone-700/50",
        className,
    )}
>
    {#each options as option}
        {#if tooltip && option.tooltip}
            <Tooltip
                title={option.tooltip.slice(0, 1).toUpperCase() + option.tooltip.slice(1)}
                disabled={!tooltip}
                placement={tooltipPlacement}
                class="flex flex-1"
            >
                {@render toggleItem(option)}
            </Tooltip>
        {:else}
            {@render toggleItem(option)}
        {/if}
    {/each}
</ToggleGroup.Root>
