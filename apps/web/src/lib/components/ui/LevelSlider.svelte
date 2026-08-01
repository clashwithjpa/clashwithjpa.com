<script lang="ts">
    import { cn } from "$lib/utils";
    import { Slider } from "@ark-ui/svelte/slider";
    import type { Snippet } from "svelte";

    type Level = { value: string; label: string };

    let {
        levels,
        value = $bindable(),
        label,
        disabled = false,
        name,
        trailing,
        class: className,
    }: {
        levels: Level[];
        value: string;
        label?: string;
        disabled?: boolean;
        name?: string;
        trailing?: Snippet<[string]>;
        class?: string;
    } = $props();

    const index = $derived(
        Math.max(
            0,
            levels.findIndex((l) => l.value === value),
        ),
    );

    const sliderValue = $derived([index]);

    const isSlidable = $derived(levels.length > 1);

    function select(next: number) {
        const level = levels[next];
        if (level) value = level.value;
    }
</script>

{#snippet rows()}
    {#each levels as level, i (level.value)}
        {@const reached = i <= index}
        <button
            type="button"
            {disabled}
            onclick={() => select(i)}
            class={cn(
                "flex h-12 cursor-pointer items-center gap-2 pr-4 pl-14 text-left transition-colors duration-200 ease-in-out not-disabled:hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-50!",
                // The column is reversed, so the last level is the topmost row.
                i === levels.length - 1 && "rounded-t-lg",
                i === 0 && "rounded-b-lg",
            )}
        >
            <span class="absolute left-6 size-2 -translate-x-1/2 rounded-full {reached ? 'bg-stone-200' : 'bg-stone-700'}"></span>
            <span class="truncate text-sm font-medium transition-colors duration-200 ease-in-out {reached ? 'text-stone-50' : 'text-stone-400'}">
                {level.label}
            </span>
            {@render trailing?.(level.value)}
        </button>
    {/each}
{/snippet}

{#if isSlidable}
    <Slider.Root
        class={cn("flex flex-col gap-2", className)}
        orientation="vertical"
        thumbAlignment="center"
        min={0}
        max={levels.length - 1}
        step={1}
        value={sliderValue}
        {disabled}
        {name}
        onValueChange={(details) => select(details.value[0])}
        getAriaValueText={(details) => levels[details.value]?.label ?? String(details.value)}
    >
        {#if label}
            <Slider.Label class="text-sm font-medium text-stone-200">{label}</Slider.Label>
        {/if}

        <div class="relative flex flex-col-reverse rounded-lg border-2 border-stone-700/50 bg-stone-900">
            {@render rows()}

            <div class="absolute inset-y-6 left-4 z-10 w-4">
                <Slider.Control class="size-full">
                    <Slider.Track class="mx-auto h-full w-1 rounded-full bg-stone-700">
                        <Slider.Range class="w-full rounded-full bg-stone-200" />
                    </Slider.Track>
                    <Slider.Thumb
                        index={0}
                        class="size-4 cursor-grab rounded-full border-2 border-stone-200 bg-stone-900 shadow-xs outline-none focus-visible:ring-4 focus-visible:ring-stone-700/50 data-disabled:cursor-not-allowed data-dragging:cursor-grabbing"
                    >
                        <Slider.HiddenInput />
                    </Slider.Thumb>
                </Slider.Control>
            </div>
        </div>
    </Slider.Root>
{:else}
    <div class={cn("flex flex-col gap-2", className)}>
        {#if label}
            <span class="text-sm font-medium text-stone-200">{label}</span>
        {/if}
        <div class="relative flex flex-col-reverse rounded-lg border-2 border-stone-700/50 bg-stone-900">
            {@render rows()}
        </div>
    </div>
{/if}
