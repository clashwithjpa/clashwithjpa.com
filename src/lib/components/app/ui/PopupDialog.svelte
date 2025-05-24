<script lang="ts">
    import { cn } from "$lib/utils/cn";
    import { Dialog } from "bits-ui";
    import type { Snippet } from "svelte";
    import { fade } from "svelte/transition";
    import MaterialSymbolsCloseRounded from "~icons/material-symbols/close-rounded";

    interface Props {
        title: string;
        open?: boolean;
        style?: "coc";
        trigger?: Snippet;
        children: Snippet;
        class?: string;
    }
    let { title, open = $bindable(false), style, trigger, children, class: className }: Props = $props();

    let popupStyle: string = $state("");
    switch (style) {
        case "coc":
            popupStyle =
                "border border-gray-950 bg-linear-to-b from-gray-800 via-gray-900 to-gray-900 shadow-[0_0_5px_0.5px_var(--tw-shadow-color)] shadow-gray-950";
            break;
        default:
            popupStyle = "border border-gray-700 bg-gray-900";
    }
</script>

<Dialog.Root bind:open>
    {#if trigger}
        <Dialog.Trigger class="flex w-full items-center justify-center">
            {@render trigger()}
        </Dialog.Trigger>
    {/if}
    <Dialog.Portal>
        <Dialog.Overlay class="fixed inset-0 z-200 flex size-full items-center justify-center backdrop-blur-xs" forceMount>
            {#snippet child({ props, open })}
                {#if open}
                    <div {...props} transition:fade={{ duration: 100 }}>
                        <Dialog.Content class={cn("flex max-w-[90%] flex-col gap-5 rounded-lg p-5 text-sm md:max-w-[50%]", popupStyle, className)}>
                            <div class="flex flex-col gap-2 text-left">
                                <div class="flex items-center justify-between gap-2">
                                    <Dialog.Title class="text-xl font-extrabold">{title}</Dialog.Title>
                                    <Dialog.Close class="cursor-pointer transition-all duration-200 hover:brightness-80">
                                        <MaterialSymbolsCloseRounded class="size-6" />
                                    </Dialog.Close>
                                </div>
                                <div class="flex items-center justify-center gap-2">
                                    {@render children()}
                                </div>
                            </div>
                        </Dialog.Content>
                    </div>
                {/if}
            {/snippet}
        </Dialog.Overlay>
    </Dialog.Portal>
</Dialog.Root>
