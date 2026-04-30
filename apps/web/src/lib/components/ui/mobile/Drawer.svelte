<script lang="ts">
    import { cn } from "$lib/utils";
    import type { Snippet } from "svelte";
    import { Drawer } from "vaul-svelte";
    import TablerX from "~icons/tabler/x";
    import Button from "../Button.svelte";

    let {
        open = $bindable(false),
        onClose = () => {},
        title = "",
        trigger,
        children,
        class: className = "",
        zIndex = "z-9999!",
    }: {
        open?: boolean;
        onClose?: () => void;
        title?: string;
        trigger?: Snippet;
        children: Snippet;
        class?: string;
        zIndex?: string;
    } = $props();
</script>

<Drawer.Root bind:open {onClose} closeOnOutsideClick={false}>
    {#if trigger}
        <Drawer.Trigger>{@render trigger()}</Drawer.Trigger>
    {/if}
    <Drawer.Portal>
        <Drawer.Overlay
            class={cn("fixed inset-0 bg-stone-950/60 backdrop-blur-sm transition-all duration-200", zIndex)}
            onclick={() => (open = false)}
        />
        <Drawer.Content
            class={cn("fixed inset-x-0 bottom-0 mt-24 flex max-h-[calc(100vh-6rem)] flex-col outline-none focus:outline-none", className, zIndex)}
        >
            <div class="pointer-events-none absolute inset-x-0 top-0 bottom-[-100vh] rounded-t-2xl border-t-2 border-stone-700/50 bg-stone-900"></div>

            <div class="relative z-10 flex min-h-0 w-full flex-1 flex-col">
                <Button
                    type="button"
                    size="icon"
                    aria-label="Close drawer"
                    onclick={() => (open = false)}
                    class="absolute top-0 left-1/2 z-20 grid -translate-x-1/2 -translate-y-16 cursor-pointer rounded-full"
                >
                    <TablerX />
                </Button>

                {#if title}
                    <div class="flex shrink-0 items-center justify-center px-4 pt-8 pb-4">
                        <h2 class="text-xl font-semibold text-stone-50">{title}</h2>
                    </div>
                {/if}

                <div
                    data-vaul-no-drag
                    class="min-h-0 flex-1 overflow-x-hidden overflow-y-auto p-4 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                >
                    {@render children()}
                </div>
            </div>
        </Drawer.Content>
    </Drawer.Portal>
</Drawer.Root>
