<script lang="ts">
    import { cn } from "$lib/utils";
    import type { Snippet } from "svelte";
    import type { HTMLInputAttributes } from "svelte/elements";
    import TablerX from "~icons/tabler/x";

    let {
        value = $bindable(""),
        label,
        icon,
        class: className = "",
        ...rest
    }: Omit<HTMLInputAttributes, "value" | "class"> & {
        value?: string;
        label: string;
        icon?: Snippet;
        class?: string;
    } = $props();

    let input: HTMLInputElement | undefined = $state();
</script>

<!-- The frame carries the focus state, so the input itself stays bare (the forms plugin would otherwise ring it). -->
<label class={cn("coc-input group flex h-10 items-center gap-2 rounded-xl border-2 border-black px-3 coc-slot", className)}>
    <span class="sr-only">{label}</span>
    {#if icon}
        <span class="flex shrink-0 text-parchment/50 transition-colors duration-200 group-focus-within:text-parchment/90">{@render icon()}</span>
    {/if}
    <input
        bind:this={input}
        bind:value
        {...rest}
        class="h-full min-w-0 flex-1 border-0 bg-transparent p-0 font-coc text-base text-white shadow-none placeholder:text-parchment/45 focus:border-0 focus:shadow-none focus:ring-0 focus:outline-none [&::-webkit-search-cancel-button]:appearance-none"
    />
    <!-- Replaces the browser's own blue clear button, which is hidden above. -->
    {#if rest.type === "search" && value}
        <button
            type="button"
            aria-label="Clear"
            onclick={() => {
                value = "";
                input?.focus();
            }}
            class="grid size-6 shrink-0 cursor-pointer place-items-center rounded-md text-parchment/60 transition-colors duration-200 hover:bg-black/20 hover:text-white"
        >
            <TablerX class="size-4" />
        </button>
    {/if}
</label>

<style>
    /* Stays sunk into the board like the game's fields: it warms up and gains a soft amber inner edge instead of a web ring. */
    .coc-input {
        transition:
            box-shadow 200ms ease,
            background 200ms ease;
    }

    .coc-input:focus-within {
        background: linear-gradient(180deg, #5a3b2c, #634232);
        box-shadow:
            inset 0 2px 4px rgba(0, 0, 0, 0.35),
            inset 0 0 0 1px rgba(255, 205, 106, 0.55),
            0 1px 0 rgba(255, 220, 190, 0.08);
    }
</style>
