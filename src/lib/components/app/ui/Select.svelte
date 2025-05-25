<script lang="ts">
    import { cn, type WithElementRef } from "$lib/utils.js";
    import type { HTMLSelectAttributes } from "svelte/elements";

    type Props = WithElementRef<Omit<HTMLSelectAttributes, "type">>;

    let { children, ref = $bindable(null), value = $bindable(), class: className, ...restProps }: Props = $props();
</script>

<select
    bind:this={ref}
    class={cn(
        "app-select appearance-none rounded-lg border border-gray-700 bg-gray-900 px-2 py-2 focus:border-blue-700 focus:shadow-none focus:outline-none disabled:cursor-not-allowed disabled:opacity-50",
        className
    )}
    bind:value
    {...restProps}
>
    {@render children?.()}
</select>

<style>
    .app-select::-webkit-inner-spin-button::-webkit-outer-spin-button {
        -webkit-appearance: none;
        display: none;
        margin: 0;
    }
</style>
