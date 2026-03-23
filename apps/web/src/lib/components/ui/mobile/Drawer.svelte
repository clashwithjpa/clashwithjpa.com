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
            class={cn(
                "fixed inset-x-0 bottom-0 z-9999! mt-24 flex h-auto flex-col rounded-t-2xl border-t-2 border-stone-700/50 bg-stone-900 outline-none focus:outline-none",
                className,
            )}
        >
            <div class="relative flex h-full flex-col">
                <div class="mx-auto mt-4 h-1.5 w-12 rounded-full bg-stone-700"></div>

                {#if title}
                    <div class="flex items-center justify-center p-4">
                        <h2 class="text-xl font-semibold text-stone-50">{title}</h2>
                    </div>
                {/if}

                <div class="overflow-x-hidden overflow-y-auto px-4 pb-8">
                    {@render children()}
                </div>
            </div>
        </Drawer.Content>
    </Drawer.Portal>
</Drawer.Root>
