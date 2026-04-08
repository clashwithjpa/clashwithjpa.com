<script lang="ts">
    import { cn } from "$lib/utils.js";
    import type { Component } from "svelte";
    import TablerChevronDown from "~icons/tabler/chevron-down";
    import Icon from "./Icon.svelte";
    import RawPopup from "./RawPopup.svelte";

    export type Option = { label: string; value: string; icon?: Component | string };

    let {
        value = $bindable(),
        options = [],
        placeholder = "Select an option",
        class: className = "",
        disabled = false,
        open = $bindable(false),
    }: {
        open?: boolean;
        value?: string;
        options: Option[];
        placeholder?: string;
        class?: string;
        disabled?: boolean;
    } = $props();

    let selectedOption = $derived(options.find((o) => o.value === value));
    let selectedLabel = $derived(selectedOption?.label || placeholder);

    function selectOption(val: string) {
        value = val;
        open = false;
    }
</script>

<RawPopup
    bind:open
    class={cn("relative w-full", className)}
    contentClass="p-2"
    maxWidth="w-[var(--reference-width)] sm:w-[var(--reference-width)] min-w-48"
>
    {#snippet trigger()}
        <div
            class={cn(
                "flex w-full cursor-pointer items-center justify-between rounded-lg border-2 border-stone-700/50 bg-stone-900 px-4 py-2 text-base text-stone-50 shadow-xs transition-colors duration-200 ease-in-out outline-none hover:bg-stone-700 focus-visible:border-stone-700 focus-visible:ring-4 focus-visible:ring-stone-700/50 disabled:cursor-not-allowed disabled:opacity-50! md:text-sm",
                !value && "text-stone-400",
                disabled && "cursor-not-allowed opacity-50!",
            )}
        >
            <div class="flex items-center gap-2 truncate">
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
            <TablerChevronDown class={cn("size-4 shrink-0 text-stone-400 transition-transform duration-200", open && "rotate-180")} />
        </div>
    {/snippet}

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
</RawPopup>
