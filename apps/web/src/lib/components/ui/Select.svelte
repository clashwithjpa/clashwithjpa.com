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
        onValueChange,
    }: {
        open?: boolean;
        value?: string;
        options: Option[];
        placeholder?: string;
        class?: string;
        disabled?: boolean;
        onValueChange?: (value: string) => void;
    } = $props();

    let selectedOption = $derived(options.find((o) => o.value === value));
    let selectedLabel = $derived(selectedOption?.label || placeholder);

    let search = $state("");
    let searchRef = $state<HTMLInputElement | null>(null);
    let filteredOptions = $derived(search.trim() ? options.filter((o) => o.label.toLowerCase().includes(search.trim().toLowerCase())) : options);

    function selectOption(val: string) {
        value = val;
        open = false;
        onValueChange?.(val);
    }

    // Clear the query when the dropdown closes; focus the trigger input when it opens.
    $effect(() => {
        if (open) {
            requestAnimationFrame(() => searchRef?.select());
        } else {
            search = "";
        }
    });

    function onSearchKeydown(e: KeyboardEvent) {
        if (e.key === "Enter" && filteredOptions.length > 0) {
            e.preventDefault();
            selectOption(filteredOptions[0].value);
        }
    }
</script>

<RawPopup
    bind:open
    class={cn("relative w-full", className)}
    contentClass="p-2 z-9999"
    maxWidth="w-max min-w-[var(--reference-width)] max-w-[var(--available-width)]"
>
    {#snippet trigger()}
        <div
            class={cn(
                "flex w-full cursor-pointer items-center justify-between gap-2 rounded-lg border-2 border-stone-700/50 bg-stone-900 px-4 py-2 text-sm text-stone-50 shadow-xs transition-colors duration-200 ease-in-out outline-none focus-visible:border-stone-700 focus-visible:ring-4 focus-visible:ring-stone-700/50 disabled:cursor-not-allowed disabled:opacity-50!",
                !value && "text-stone-400",
                open && "border-stone-700 ring-4 ring-stone-700/50",
                disabled && "cursor-not-allowed opacity-50!",
            )}
        >
            <div class="flex min-w-0 flex-1 items-center gap-2">
                {#if selectedOption?.icon && !open}
                    {#if typeof selectedOption.icon === "string"}
                        {#if selectedOption.icon.includes("http")}
                            <div class="size-5 shrink-0 bg-cover bg-center" style="background-image: url({selectedOption.icon})"></div>
                        {:else}
                            <Icon name={selectedOption.icon} class="size-5 shrink-0" />
                        {/if}
                    {:else}
                        {@const IconComponent = selectedOption.icon}
                        <IconComponent class="size-5 shrink-0" />
                    {/if}
                {/if}

                <input
                    bind:this={searchRef}
                    value={open ? search : selectedLabel}
                    oninput={(e) => (search = e.currentTarget.value)}
                    onkeydown={onSearchKeydown}
                    onpointerdown={(e) => {
                        if (open) e.stopPropagation();
                    }}
                    placeholder={open && value ? selectedLabel : placeholder}
                    readonly={!open}
                    {disabled}
                    class={cn(
                        "w-full min-w-0 truncate border-0 bg-transparent p-0 text-sm text-stone-50 shadow-none ring-0 outline-none placeholder:text-stone-400 focus:ring-0 focus:outline-none",
                        open ? "cursor-text" : "pointer-events-none cursor-pointer",
                        !value && !open && "text-stone-400",
                    )}
                />
            </div>
            <TablerChevronDown class={cn("size-4 shrink-0 text-stone-400 transition-transform duration-200", open && "rotate-180")} />
        </div>
    {/snippet}

    <div class="flex flex-col gap-1">
        {#each filteredOptions as option}
            <button
                type="button"
                class={cn(
                    "flex w-full cursor-pointer items-center rounded-lg px-2 py-2 text-sm text-stone-200 transition-colors duration-200 ease-in-out outline-none hover:bg-stone-700/50 hover:text-stone-50",
                    value === option.value && "bg-stone-800 text-stone-50",
                )}
                onclick={() => selectOption(option.value)}
            >
                <div class="flex min-w-0 items-center gap-2 text-left">
                    {#if option.icon}
                        {#if typeof option.icon === "string"}
                            {#if option.icon.includes("http")}
                                <div class="size-5 shrink-0 bg-cover bg-center" style="background-image: url({option.icon})"></div>
                            {:else}
                                <Icon name={option.icon} class="size-5 shrink-0" />
                            {/if}
                        {:else}
                            {@const IconComponent = option.icon}
                            <IconComponent class="size-5 shrink-0" />
                        {/if}
                    {/if}
                    <span class="truncate">{option.label}</span>
                </div>
            </button>
        {/each}
        {#if filteredOptions.length === 0}
            <div class="py-2 text-center text-sm text-stone-400">No options found.</div>
        {/if}
    </div>
</RawPopup>
