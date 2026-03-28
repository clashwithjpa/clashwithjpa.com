<script lang="ts">
    import { cn } from "$lib/utils";
    import type { Component } from "svelte";
    import Icon from "./Icon.svelte";

    let props: {
        icon?: Component | string;
        content: string;
        variant?: "blue" | "green" | "red" | "yellow" | "ghost";
        class?: string;
    } = $props();

    const colors = {
        blue: "border-blue-700/50 bg-blue-800/60 text-blue-200",
        green: "border-green-700/50 bg-green-800/60 text-green-200",
        red: "border-red-700/50 bg-red-800/60 text-red-200",
        yellow: "border-yellow-700/50 bg-yellow-800/60 text-yellow-200",
        ghost: "border-stone-700/50 bg-stone-900 text-stone-200",
    };
</script>

<div class={cn(`flex w-fit shrink-0 items-center justify-center gap-1 rounded border ${colors[props.variant ?? "blue"]} px-1.5 py-0.5`, props.class)}>
    {#if props.icon}
        {#if typeof props.icon === "string"}
            <Icon name={props.icon} class="size-3" />
        {:else}
            <props.icon class="size-4" />
        {/if}
    {/if}
    <span class="cursor-default font-rubik text-xs capitalize select-none">{props.content}</span>
</div>
