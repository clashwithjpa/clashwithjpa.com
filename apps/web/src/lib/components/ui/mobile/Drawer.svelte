<script lang="ts">
    import { cn } from "$lib/utils";
    import type { Snippet } from "svelte";
    import { Drawer } from "vaul-svelte";

    let {
        open = $bindable(false),
        onClose = () => {},
        title = "",
        trigger,
        children,
        class: className = "",
    }: {
        open?: boolean;
        onClose?: () => void;
        title?: string;
        trigger: Snippet;
        children: Snippet;
        class?: string;
    } = $props();
</script>

<Drawer.Root bind:open {onClose}>
    <Drawer.Trigger>{@render trigger()}</Drawer.Trigger>
    <Drawer.Portal>
        <Drawer.Overlay class="fixed inset-0 z-9999! bg-stone-950/60 backdrop-blur-sm transition-all duration-200" />
        <Drawer.Content
            class={cn("fixed inset-x-0 bottom-0 z-9999! mt-24 flex max-h-[calc(100vh-6rem)] flex-col outline-none focus:outline-none", className)}
        >
            <div class="pointer-events-none absolute inset-x-0 top-0 bottom-[-100vh] rounded-t-2xl border-t-2 border-stone-700/50 bg-stone-900"></div>

            <div class="relative z-10 flex min-h-0 w-full flex-1 flex-col">
                <div class="mx-auto mt-4 h-1.5 w-12 shrink-0 rounded-full bg-stone-700"></div>

                {#if title}
                    <div class="flex shrink-0 items-center justify-center p-4">
                        <h2 class="text-xl font-semibold text-stone-50">{title}</h2>
                    </div>
                {/if}

                <div
                    data-vaul-no-drag
                    class="min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-4 pb-4 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                >
                    {@render children()}
                </div>
            </div>
        </Drawer.Content>
    </Drawer.Portal>
</Drawer.Root>
