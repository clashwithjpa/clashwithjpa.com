<script lang="ts">
    import Icon from "$lib/components/ui/Icon.svelte";
    import { cn } from "$lib/utils.js";
    import type { ICellEditorParams } from "ag-grid-community";
    import type { Component } from "svelte";

    type Option = { label: string; value: string; icon?: Component | string };
    let { params }: { params: ICellEditorParams & { options?: Option[] } } = $props();

    let currentValue = $derived(params.value);

    let parsedOptions: Option[] = $derived.by(() => {
        if (params.options) return params.options;
        if ((params as any).values) {
            return (params as any).values.map((v: string) => ({ label: v, value: v }));
        }
        return [];
    });

    function selectOption(val: string) {
        currentValue = val;
        (params as any)._currentValue = currentValue;
        params.stopEditing();
    }

    $effect(() => {
        (params as any)._currentValue = currentValue;
    });
</script>

<div class="flex max-h-60 w-full min-w-40 flex-col gap-1 overflow-y-auto rounded-lg border border-stone-800 bg-stone-900 p-2 shadow-xl">
    {#each parsedOptions as option}
        <button
            type="button"
            class={cn(
                "flex w-full cursor-pointer items-center rounded-md px-3 py-2 text-sm text-stone-300 transition-all duration-200 outline-none hover:bg-stone-800 hover:text-stone-50 focus:bg-stone-800 focus:text-stone-50",
                currentValue === option.value && "bg-stone-800 font-medium text-stone-50",
            )}
            onclick={() => selectOption(option.value)}
            onkeydown={(e) => {
                if (e.key === "Enter") selectOption(option.value);
            }}
        >
            <div class="flex items-center gap-2 truncate">
                {#if option.icon}
                    {#if typeof option.icon === "string"}
                        {#if option.icon.includes("http")}
                            <div class="size-4 rounded-full bg-cover bg-center" style="background-image: url({option.icon})"></div>
                        {:else}
                            <Icon name={option.icon} class="size-4" />
                        {/if}
                    {:else}
                        {@const IconComponent = option.icon}
                        <IconComponent class="size-4" />
                    {/if}
                {/if}
                <span>{option.label}</span>
            </div>
        </button>
    {/each}
    {#if parsedOptions.length === 0}
        <div class="py-2 text-center text-sm text-stone-500">No options found.</div>
    {/if}
</div>
