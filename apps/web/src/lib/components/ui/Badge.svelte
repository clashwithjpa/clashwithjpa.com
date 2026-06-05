<script lang="ts">
    import { cn } from "$lib/utils";
    import { bounceDown, bounceUp } from "$lib/utils/animations";
    import type { Component } from "svelte";
    import Icon from "./Icon.svelte";

    let props: {
        icon?: Component | string;
        content?: string;
        variant?: "blue" | "green" | "red" | "yellow" | "ghost";
        class?: string;
        iconSize?: string;
        onclick?: (e: MouseEvent) => void;
    } = $props();

    const colors = {
        blue: "border-blue-700/50 bg-blue-900 text-blue-200",
        green: "border-green-700/50 bg-green-900 text-green-200",
        red: "border-red-700/50 bg-red-900 text-red-200",
        yellow: "border-yellow-700/50 bg-yellow-900 text-yellow-200",
        ghost: "border-stone-700/50 bg-stone-900 text-stone-200",
    };

    const hoverColors = {
        blue: "hover:bg-blue-700 hover:text-blue-50",
        green: "hover:bg-green-700 hover:text-green-50",
        red: "hover:bg-red-700 hover:text-red-50",
        yellow: "hover:bg-yellow-700 hover:text-yellow-50",
        ghost: "hover:bg-stone-700 hover:text-stone-50",
    };

    let iconSize = $derived(props.iconSize ?? "size-3");
    let isClickable = $derived(!!props.onclick);

    let baseClass = $derived(
        cn("flex w-fit shrink-0 items-center justify-center gap-1 rounded border px-1.5 py-0.5", colors[props.variant ?? "blue"], props.class),
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
    {#if props.icon}
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
        class={cn(baseClass, "cursor-pointer transition-colors duration-200", hoverColors[props.variant ?? "blue"])}
    >
        {@render inner()}
    </button>
{:else}
    <div class={baseClass}>
        {@render inner()}
    </div>
{/if}
