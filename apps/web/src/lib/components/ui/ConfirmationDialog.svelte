<script lang="ts">
    import Button from "$lib/components/ui/Button.svelte";
    import MobileDrawer from "$lib/components/ui/mobile/Drawer.svelte";
    import { cn } from "$lib/utils";
    import { createMobileMediaQuery } from "$lib/utils/mobile";
    import { Dialog } from "@ark-ui/svelte/dialog";
    import { Portal } from "@ark-ui/svelte/portal";
    import { onMount, type Snippet } from "svelte";
    import TablerX from "~icons/tabler/x";

    let {
        children,
        title,
        description,
        confirmText = "Confirm",
        cancelText = "Cancel",
        onConfirm,
        class: className = "",
    }: {
        children: Snippet;
        title: string;
        description: string;
        confirmText?: string;
        cancelText?: string;
        onConfirm: () => void;
        class?: string;
    } = $props();

    let open = $state(false);
    let isMobile = $state(false);

    onMount(() => {
        const cleanup = createMobileMediaQuery((mobile) => {
            isMobile = mobile;
        });
        return cleanup;
    });

    function handleConfirm() {
        onConfirm();
        open = false;
    }

    function handleCancel() {
        open = false;
    }
</script>

{#if isMobile}
    <MobileDrawer bind:open {title}>
        {#snippet trigger()}
            <div class={cn("m-0 flex cursor-pointer items-center justify-center border-none bg-transparent p-0 outline-none", className)}>
                {@render children()}
            </div>
        {/snippet}
        <div class="flex flex-col gap-4">
            <p class="text-sm text-stone-200">
                {description}
            </p>
            <div class="mt-4 flex w-full flex-col gap-3 sm:flex-row sm:justify-end sm:gap-4">
                <Button variant="ghost" onclick={handleCancel} class="w-full sm:w-auto">{cancelText}</Button>
                <Button variant="base" onclick={handleConfirm} class="w-full sm:w-auto">{confirmText}</Button>
            </div>
        </div>
    </MobileDrawer>
{:else}
    <Dialog.Root bind:open>
        <Dialog.Trigger class={cn("m-0 flex cursor-pointer items-center justify-center border-none bg-transparent p-0 outline-none", className)}>
            {@render children()}
        </Dialog.Trigger>
        <Portal>
            <Dialog.Backdrop
                class="fixed inset-0 z-9999 bg-stone-950/60 backdrop-blur-sm transition-all duration-200 data-[state=closed]:animate-out data-[state=closed]:fade-out data-[state=open]:animate-in data-[state=open]:fade-in"
            />
            <Dialog.Positioner class="fixed inset-0 z-9999 flex items-center justify-center p-4">
                <Dialog.Content
                    class="flex w-full max-w-md flex-col gap-4 rounded-lg border-2 border-stone-700/50 bg-stone-900 p-6 shadow-2xl transition-all duration-200 outline-none data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
                >
                    <div class="flex flex-col gap-4">
                        <div class="flex items-center justify-between">
                            <Dialog.Title class="text-2xl font-semibold text-stone-50">{title}</Dialog.Title>
                            <Dialog.CloseTrigger>
                                <Button variant="ghost" size="" class="size-8">
                                    <TablerX class="size-6" />
                                </Button>
                            </Dialog.CloseTrigger>
                        </div>
                        <Dialog.Description class="text-sm text-stone-200">
                            {description}
                        </Dialog.Description>
                    </div>
                    <div class="mt-4 flex w-full justify-end gap-4">
                        <Button variant="ghost" onclick={handleCancel}>{cancelText}</Button>
                        <Button variant="base" onclick={handleConfirm}>{confirmText}</Button>
                    </div>
                </Dialog.Content>
            </Dialog.Positioner>
        </Portal>
    </Dialog.Root>
{/if}
