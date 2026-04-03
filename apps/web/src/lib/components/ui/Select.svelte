<script lang="ts">
    import { cn } from "$lib/utils.js";
    import type { Component } from "svelte";
    import { cubicInOut } from "svelte/easing";
    import { scale } from "svelte/transition";
    import TablerChevronDown from "~icons/tabler/chevron-down";
    import Icon from "./Icon.svelte";

    export type Option = { label: string; value: string; icon?: Component | string };

    let {
        value = $bindable(),
        options = [],
        placeholder = "Select an option",
        class: className = "",
        disabled = false,
    }: {
        value?: string;
        options: Option[];
        placeholder?: string;
        class?: string;
        disabled?: boolean;
    } = $props();

    let open = $state(false);

    let selectedOption = $derived(options.find((o) => o.value === value));
    let selectedLabel = $derived(selectedOption?.label || placeholder);

    function toggle() {
        if (!disabled) open = !open;
    }

    function selectOption(val: string) {
        value = val;
        open = false;
    }

    function handleKeydown(e: KeyboardEvent) {
        if (e.key === "Escape") open = false;
    }

    let containerNode: HTMLElement | undefined = $state();

    function handleWindowClick(e: MouseEvent) {
        if (open && containerNode && !containerNode.contains(e.target as Node)) {
            open = false;
        }
    }
</script>

<svelte:window onkeydown={handleKeydown} onclick={handleWindowClick} />

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div bind:this={containerNode} class={cn("relative w-full", className)}>
    <button
        type="button"
        {disabled}
        onclick={toggle}
        class={cn(
            "flex w-full cursor-pointer items-center justify-between rounded-lg border-2 border-stone-700/50 bg-stone-900 px-4 py-2 text-base text-stone-50 shadow-xs transition-colors duration-200 ease-in-out outline-none focus-visible:border-stone-700 focus-visible:ring-4 focus-visible:ring-stone-700/50 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
            !value && "text-stone-400",
        )}
    >
        <div class="flex items-center gap-2">
            {#if selectedOption?.icon}
                {#if typeof selectedOption.icon === "string"}
                    {#if selectedOption.icon.includes("http")}
                        <div class="size-5 bg-cover bg-center" style="background-image: url({selectedOption.icon})"></div>
                    {:else}
                        <Icon name={selectedOption.icon} class="size-5" />
                    {/if}
                {:else}
                    {@const IconComponent = selectedOption.icon}
                    <IconComponent class="size-5" />
                {/if}
            {/if}
            <span>{selectedLabel}</span>
        </div>
        <TablerChevronDown class={cn("size-4 text-stone-400 transition-transform duration-200", open && "rotate-180")} />
    </button>

    {#if open}
        <div
            transition:scale={{ duration: 150, start: 0.95, easing: cubicInOut }}
            class="absolute z-10 mt-2 max-h-60 w-full overflow-auto rounded-lg border-2 border-stone-700/50 bg-stone-900 p-2 shadow-xl outline-none"
        >
            <div class="flex flex-col gap-1">
                {#each options as option}
                    <button
                        type="button"
                        class={cn(
                            "flex w-full cursor-pointer items-center rounded-lg px-2 py-2 text-sm text-stone-200 transition-colors duration-200 ease-in-out outline-none hover:bg-stone-700/50 hover:text-stone-50 focus:bg-stone-700/50 focus:text-stone-50",
                            value === option.value && "bg-stone-800 text-stone-50",
                        )}
                        onclick={() => selectOption(option.value)}
                    >
                        <div class="flex items-center gap-2">
                            {#if option.icon}
                                {#if typeof option.icon === "string"}
                                    {#if option.icon.includes("http")}
                                        <div class="size-5 bg-cover bg-center" style="background-image: url({option.icon})"></div>
                                    {:else}
                                        <Icon name={option.icon} class="size-5" />
                                    {/if}
                                {:else}
                                    {@const IconComponent = option.icon}
                                    <IconComponent class="size-5" />
                                {/if}
                            {/if}
                            <span>{option.label}</span>
                        </div>
                    </button>
                {/each}
                {#if options.length === 0}
                    <div class="py-2 text-center text-sm text-stone-400">No options found.</div>
                {/if}
            </div>
        </div>
    {/if}
</div>
