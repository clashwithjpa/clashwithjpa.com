<script lang="ts">
    import { cn } from "$lib/utils";
    import { Drawer } from "@ark-ui/svelte/drawer";
    import { Portal } from "@ark-ui/svelte/portal";
    import type { Snippet } from "svelte";
    import TablerX from "~icons/tabler/x";
    import Button from "../Button.svelte";

    interface Props {
        open?: boolean;
        onOpenChange?: (details: Drawer.OpenChangeDetails) => void;
        onClose?: () => void;
        title?: string;
        trigger?: Snippet;
        children: Snippet;
        class?: string;
        isParent?: boolean;
    }

    let {
        open = $bindable(false),
        onOpenChange,
        onClose = () => {},
        title = "",
        trigger,
        children,
        class: className = "",
        isParent = false,
    }: Props = $props();

    function handleOpenChange(details: Drawer.OpenChangeDetails) {
        open = details.open;
        onOpenChange?.(details);
    }

    function handleInteractOutside(event: Event) {
        if (!isParent) {
            event.stopPropagation();
        }
    }
</script>

<Drawer.Root bind:open onOpenChange={handleOpenChange} onExitComplete={onClose} onInteractOutside={handleInteractOutside}>
    {#if trigger}
        <Drawer.Trigger>
            {@render trigger()}
        </Drawer.Trigger>
    {/if}

    <Portal>
        <Drawer.Backdrop
            class={cn(
                "pointer-events-auto fixed inset-0 bg-stone-950/60 backdrop-blur-sm transition-all duration-200",
                "data-[state=closed]:animate-out data-[state=open]:animate-in",
                "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
                "z-9999!",
            )}
            onpointerdown={handleInteractOutside}
        />

        <Drawer.Positioner class={cn("pointer-events-none fixed inset-0 z-9999! flex items-end justify-center")}>
            <Drawer.Content
                class={cn(
                    "pointer-events-auto relative flex max-h-[calc(100vh-6rem)] w-full max-w-2xl flex-col overflow-visible rounded-t-2xl border-t border-stone-700/50 bg-stone-900 transition-all duration-200 outline-none focus:outline-none",
                    "data-[state=closed]:animate-out data-[state=open]:animate-in",
                    "data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom",
                    className,
                )}
            >
                <Button
                    type="button"
                    size="icon"
                    aria-label="Close drawer"
                    onclick={() => (open = false)}
                    class="pointer-events-auto absolute top-0 left-1/2 z-20 grid -translate-x-1/2 -translate-y-12 cursor-pointer rounded-full"
                >
                    <TablerX />
                </Button>

                <div
                    class="pointer-events-none absolute inset-x-0 top-0 bottom-[-100vh] rounded-t-2xl border-t border-stone-700/50 bg-stone-900"
                ></div>

                <div class="relative z-10 flex min-h-0 w-full flex-1 flex-col overflow-hidden rounded-t-2xl">
                    {#if title}
                        <div class="flex shrink-0 items-center justify-center px-4 pt-8 pb-4">
                            <h2 class="text-xl font-semibold text-stone-50">{title}</h2>
                        </div>
                    {/if}

                    <div
                        class="no-drag min-h-0 flex-1 overflow-x-hidden overflow-y-auto p-4 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                    >
                        {@render children()}
                    </div>
                </div>
            </Drawer.Content>
        </Drawer.Positioner>
    </Portal>
</Drawer.Root>
