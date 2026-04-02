<script lang="ts">
    import { cn, type WithElementRef } from "$lib/utils.js";
    import type { HTMLInputAttributes, HTMLInputTypeAttribute } from "svelte/elements";
    import TablerEye from "~icons/tabler/eye";
    import TablerEyeOff from "~icons/tabler/eye-off";

    type InputType = Exclude<HTMLInputTypeAttribute, "file">;

    type Props = WithElementRef<Omit<HTMLInputAttributes, "type"> & ({ type: "file"; files?: FileList } | { type?: InputType; files?: undefined })>;

    let { ref = $bindable(null), value = $bindable(), type, files = $bindable(), class: className, ...restProps }: Props = $props();

    let isPasswordVisible = $state(false);
    let currentInputType = $derived(type === "password" ? (isPasswordVisible ? "text" : "password") : type);
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
{:else if type === "password"}
    <div class="relative flex w-full items-center">
        <input
            bind:this={ref}
            data-slot="input"
            class={cn(
                "flex w-full min-w-0 rounded-lg border-2 border-stone-700/50 bg-stone-900 px-4 py-2 text-base text-stone-50 shadow-xs outline-none  selection:bg-stone-700 selection:text-stone-50 placeholder:text-stone-400 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
                "transition-colors duration-200 ease-in-out focus-visible:border-stone-700 focus-visible:ring-4 focus-visible:ring-stone-700/50",
                "aria-invalid:border-red-700/50 aria-invalid:ring-red-700/50 dark:aria-invalid:ring-red-700/50",
                "pr-10",
                className,
            )}
            type={currentInputType}
            bind:value
            {...restProps}
        />
        <button
            type="button"
            onclick={() => (isPasswordVisible = !isPasswordVisible)}
            class="absolute right-2 flex items-center justify-center rounded-lg p-1 text-stone-400 transition-colors duration-200 hover:bg-stone-700/50 hover:text-stone-50 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={restProps.disabled}
            aria-label={isPasswordVisible ? "Hide password" : "Show password"}
            tabindex="-1"
        >
            {#if isPasswordVisible}
                <TablerEyeOff class="size-5" />
            {:else}
                <TablerEye class="size-5" />
            {/if}
        </button>
    </div>
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
