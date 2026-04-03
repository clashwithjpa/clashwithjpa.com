<script lang="ts">
    import { cn, type WithElementRef } from "$lib/utils.js";
    import type { HTMLInputAttributes, HTMLInputTypeAttribute } from "svelte/elements";
    import TablerCheck from "~icons/tabler/check";
    import TablerChevronDown from "~icons/tabler/chevron-down";
    import TablerChevronUp from "~icons/tabler/chevron-up";
    import TablerEye from "~icons/tabler/eye";
    import TablerEyeOff from "~icons/tabler/eye-off";

    type InputType = Exclude<HTMLInputTypeAttribute, "file">;

    type Props = WithElementRef<Omit<HTMLInputAttributes, "type"> & ({ type: "file"; files?: FileList } | { type?: InputType; files?: undefined })>;

    let {
        ref = $bindable(null),
        value = $bindable(),
        checked = $bindable(),
        type,
        files = $bindable(),
        class: className,
        ...restProps
    }: Props = $props();

    let isPasswordVisible = $state(false);
    let currentInputType = $derived(type === "password" ? (isPasswordVisible ? "text" : "password") : type);

    function stepUp() {
        if (ref && "stepUp" in ref) {
            (ref as HTMLInputElement).stepUp();
            value = Number((ref as HTMLInputElement).value);
        }
    }

    function stepDown() {
        if (ref && "stepDown" in ref) {
            (ref as HTMLInputElement).stepDown();
            value = Number((ref as HTMLInputElement).value);
        }
    }
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
{:else if type === "number"}
    <div class="relative flex w-full items-center">
        <input
            bind:this={ref}
            data-slot="input"
            class={cn(
                "flex w-full min-w-0 rounded-lg border-2 border-stone-700/50 bg-stone-900 py-2 pr-10 pl-4 text-base text-stone-50 shadow-xs outline-none  selection:bg-stone-700 selection:text-stone-50 placeholder:text-stone-400 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
                "transition-colors duration-200 ease-in-out focus-visible:border-stone-700 focus-visible:ring-4 focus-visible:ring-stone-700/50",
                "aria-invalid:border-red-700/50 aria-invalid:ring-red-700/50 dark:aria-invalid:ring-red-700/50",
                "[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none",
                className,
            )}
            {type}
            bind:value
            {...restProps}
        />
        <div class="absolute right-0 flex h-full flex-col overflow-hidden rounded-r-md border-l-2 border-stone-700/50">
            <button
                type="button"
                tabindex="-1"
                disabled={restProps.disabled}
                onclick={stepUp}
                class="flex flex-1 items-center justify-center border-b-2 border-stone-700/50 px-2 text-stone-400 transition-colors hover:bg-stone-700/50 hover:text-stone-50 disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Increase"
            >
                <TablerChevronUp class="size-3" />
            </button>
            <button
                type="button"
                tabindex="-1"
                disabled={restProps.disabled}
                onclick={stepDown}
                class="flex flex-1 items-center justify-center px-2 text-stone-400 transition-colors hover:bg-stone-700/50 hover:text-stone-50 disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Decrease"
            >
                <TablerChevronDown class="size-3" />
            </button>
        </div>
    </div>
{:else if type === "checkbox"}
    <div class={cn("relative flex size-5 shrink-0 items-center justify-center", className)}>
        <input
            bind:this={ref}
            type="checkbox"
            bind:checked
            class="peer absolute z-10 m-0 size-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
            {...restProps}
        />
        <div
            class="pointer-events-none size-full rounded border-2 border-stone-700/50 bg-stone-900 transition-all duration-200 peer-checked:border-stone-200 peer-checked:bg-stone-200 peer-focus-visible:border-stone-700 peer-focus-visible:ring-4 peer-focus-visible:ring-stone-700/50 peer-disabled:opacity-50"
        ></div>
        <TablerCheck
            stroke-width="3"
            class="pointer-events-none absolute size-3.5 scale-50 text-stone-900 opacity-0 transition-all duration-200 peer-checked:scale-100 peer-checked:opacity-100 peer-disabled:opacity-50"
        />
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
