<script lang="ts">
    import { cn, type WithElementRef } from "$lib/utils.js";
    import type { HTMLInputAttributes, HTMLInputTypeAttribute } from "svelte/elements";

    type InputType = Exclude<HTMLInputTypeAttribute, "file">;

    type Props = WithElementRef<Omit<HTMLInputAttributes, "type"> & ({ type: "file"; files?: FileList } | { type?: InputType; files?: undefined })>;

    let { ref = $bindable(null), value = $bindable(), type, files = $bindable(), class: className, ...restProps }: Props = $props();
</script>

{#if type === "file"}
    <input
        bind:this={ref}
        data-slot="input"
        class={cn(
            "flex w-full min-w-0 rounded-lg border-2 border-stone-700/50 bg-stone-900 px-4 py-2 text-sm text-stone-50 shadow-xs outline-none  selection:bg-stone-700 selection:text-stone-50 placeholder:text-stone-400 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
            "transition-colors duration-200 ease-in-out focus-visible:border-stone-700 focus-visible:ring-4 focus-visible:ring-stone-700/50",
            "aria-invalid:border-red-700/50 aria-invalid:ring-red-700/50 dark:aria-invalid:ring-red-700/50",
            className,
        )}
        type="file"
        bind:files
        bind:value
        {...restProps}
    />
{:else}
    <input
        bind:this={ref}
        data-slot="input"
        class={cn(
            "flex w-full min-w-0 rounded-lg border-2 border-stone-700/50 bg-stone-900 px-4 py-2 text-base text-stone-50 shadow-xs outline-none  selection:bg-stone-700 selection:text-stone-50 placeholder:text-stone-400 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
            "transition-colors duration-200 ease-in-out focus-visible:border-stone-700 focus-visible:ring-4 focus-visible:ring-stone-700/50",
            "aria-invalid:border-red-700/50 aria-invalid:ring-red-700/50 dark:aria-invalid:ring-red-700/50",
            className,
        )}
        {type}
        bind:value
        {...restProps}
    />
{/if}
