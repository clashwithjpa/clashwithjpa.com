<script lang="ts">
    import { cn } from "$lib/utils";
    import { bounceDown, bounceUp } from "$lib/utils/animations";
    import type { Component } from "svelte";
    import TablerCheck from "~icons/tabler/check";
    import Icon from "./Icon.svelte";

    let props: {
        icon?: Component | string;
        content?: string;
        variant?: "blue" | "green" | "red" | "yellow" | "purple" | "ghost" | "checkbox";
        size?: "base" | "button";
        checked?: boolean;
        class?: string;
        iconSize?: string;
        onclick?: (e: MouseEvent) => void;
    } = $props();

    const sizes = {
        base: "px-1.5 py-0.5",
        button: "px-2 py-1",
    };

    const colors = {
        blue: "border-blue-700/50 bg-blue-900 text-blue-200",
        green: "border-green-700/50 bg-green-900 text-green-200",
        red: "border-red-700/50 bg-red-900 text-red-200",
        yellow: "border-yellow-700/50 bg-yellow-900 text-yellow-200",
        purple: "border-purple-700/50 bg-purple-900 text-purple-200",
        ghost: "border-stone-700/50 bg-stone-900 text-stone-200",
    };

    const hoverColors = {
        blue: "hover:bg-blue-700 hover:text-blue-50",
        green: "hover:bg-green-700 hover:text-green-50",
        red: "hover:bg-red-700 hover:text-red-50",
        yellow: "hover:bg-yellow-700 hover:text-yellow-50",
        purple: "hover:bg-purple-700 hover:text-purple-50",
        ghost: "hover:bg-stone-700 hover:text-stone-50",
    };

    let variantClass = $derived(props.variant === "checkbox" ? (props.checked ? colors.green : colors.ghost) : colors[props.variant ?? "blue"]);

    let hoverClass = $derived(
        props.variant === "checkbox" ? (props.checked ? hoverColors.green : hoverColors.ghost) : hoverColors[props.variant ?? "blue"],
    );

    let iconSize = $derived(props.iconSize ?? "size-3");
    let isClickable = $derived(!!props.onclick);

    let baseClass = $derived(
        cn("flex w-fit shrink-0 items-center justify-center gap-1 rounded border", sizes[props.size ?? "base"], variantClass, props.class),
    );

    let isPressed = false;

    function handlePointerDown(e: Event) {
        isPressed = true;
        bounceDown(e.currentTarget as Element);
    }

    function handlePointerUp(e: Event) {
        if (isPressed) {
            isPressed = false;
            bounceUp(e.currentTarget as Element);
        }
    }
</script>

{#snippet inner()}
    {#if props.variant === "checkbox"}
        <span
            class="grid size-3.5 shrink-0 place-items-center rounded-sm border transition-all duration-200 {props.checked
                ? 'border-green-600 bg-green-600'
                : 'border-stone-600'}"
        >
            <TablerCheck
                stroke-width="3"
                class="size-3 text-white transition-all duration-200 {props.checked ? 'scale-100 opacity-100' : 'scale-50 opacity-0'}"
            />
        </span>
    {:else if props.icon}
        {#if typeof props.icon === "string"}
            {#if props.icon.includes("http")}
                <div class="{iconSize} bg-cover bg-center" style="background-image: url({props.icon})"></div>
            {:else}
                <Icon name={props.icon} class={iconSize} />
            {/if}
        {:else}
            <props.icon class={iconSize} />
        {/if}
    {/if}
    {#if props.content}
        <span class="font-rubik text-xs capitalize select-none">{props.content}</span>
    {/if}
{/snippet}

{#if isClickable}
    <button
        type="button"
        onclick={props.onclick}
        onpointerdown={handlePointerDown}
        onpointerup={handlePointerUp}
        onpointerleave={handlePointerUp}
        class={cn(baseClass, "cursor-pointer transition-colors duration-200", hoverClass)}
    >
        {@render inner()}
    </button>
{:else}
    <div class={baseClass}>
        {@render inner()}
    </div>
{/if}
