<script lang="ts">
    import { cn, type WithElementRef } from "$lib/utils.js";
    import type { HTMLInputAttributes, HTMLInputTypeAttribute } from "svelte/elements";

    type InputType = Exclude<HTMLInputTypeAttribute, "file">;

    type Props = WithElementRef<Omit<HTMLInputAttributes, "type"> & { type?: InputType }>;

    let { ref = $bindable(null), value = $bindable(), type, class: className, ...restProps }: Props = $props();
</script>

<input
    bind:this={ref}
    data-slot="input"
    class={cn(
        "app-input appearance-none rounded-lg border border-gray-700 bg-gray-900 px-2 py-2 focus:border-blue-700 focus:shadow-none focus:outline-none disabled:cursor-not-allowed disabled:opacity-50",
        className
    )}
    {type}
    bind:value
    {...restProps}
/>

<style>
    .app-input::-webkit-inner-spin-button::-webkit-outer-spin-button {
        -webkit-appearance: none;
        display: none;
        margin: 0;
    }
</style>
