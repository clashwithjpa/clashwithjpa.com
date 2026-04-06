<script lang="ts">
    import { cn } from "$lib/utils";
    import { createMobileMediaQuery } from "$lib/utils/mobile";
    import { Popover } from "@ark-ui/svelte/popover";
    import { Portal } from "@ark-ui/svelte/portal";
    import { onMount, type Snippet } from "svelte";
    import { Drawer } from "vaul-svelte";

    let {
        trigger,
        children,
        placement = "bottom",
        open = $bindable(false),
        class: className = "",
        contentClass = "",
        title = "",
        onOpenChange,
        aboveNavbar = false,
        maxWidth = "max-w-96",
    }: {
        trigger: Snippet;
        children: Snippet;
        placement?:
            | "top"
            | "top-start"
            | "top-end"
            | "bottom"
            | "bottom-start"
            | "bottom-end"
            | "left"
            | "left-start"
            | "left-end"
            | "right"
            | "right-start"
            | "right-end";
        open?: boolean;
        class?: string;
        contentClass?: string;
        title?: string;
        onOpenChange?: (details: { open: boolean }) => void;
        aboveNavbar?: boolean;
        maxWidth?: string;
    } = $props();

    // Z-index: z-30 for body popups (below navbar), z-9999 for navbar popups (above navbar and everything)
    const zIndex = $derived(aboveNavbar ? "z-9999" : "z-30");

    let isMobile = $state(false);

    onMount(() => {
        const cleanup = createMobileMediaQuery((mobile) => {
            isMobile = mobile;
        });
        return cleanup;
    });

    const v = {
        bg: "from-[#dcb897] via-[#9e5f37] to-[#3b1d0d]",
        overlay: "from-[#bd7a50] to-[#713f21]",
        gloss: "from-[#f2d0b5] to-[rgba(158,95,55,0.7)]",
    };
    const contentBg = "from-[#e4cca3] to-[#c7ad85]";
</script>

{#if isMobile}
    <Drawer.Root bind:open onClose={() => onOpenChange?.({ open: false })}>
        <Drawer.Trigger>
            <div class={cn("cursor-pointer border-none bg-transparent outline-none", className)}>
                {@render trigger()}
            </div>
        </Drawer.Trigger>
        <Drawer.Portal>
            <Drawer.Overlay class={cn("fixed inset-0 bg-stone-950/60 backdrop-blur-sm transition-all duration-200", "z-9999")} />
            <Drawer.Content
                class={cn("fixed inset-x-0 bottom-0 mt-24 flex max-h-[calc(100vh-6rem)] flex-col outline-none focus:outline-none", "z-9999")}
            >
                <div
                    class="pointer-events-none absolute inset-x-0 top-0 bottom-[-100vh] overflow-hidden rounded-t-[20px] border border-black shadow-[0_0_0_1px_#000,0_0_0_2px_#000,0_-8px_32px_rgba(0,0,0,0.6)]"
                >
                    <span class={`absolute inset-0 bg-linear-to-b ${v.bg}`}></span>
                    <span class={`absolute inset-0.5 rounded-t-[18px] bg-linear-to-b ${v.overlay} opacity-80`}></span>
                    <span class={`absolute inset-x-1.5 top-1.5 h-[40vh] rounded-t-[14px] rounded-b-xl bg-linear-to-b ${v.gloss} opacity-70`}></span>
                </div>

                <div class="relative z-10 flex min-h-0 w-full flex-1 flex-col">
                    {#if title}
                        <div class="flex shrink-0 items-center justify-center p-3 pt-5 pb-3">
                            <h2 class="text-shadow font-coc text-2xl font-black tracking-wider text-white uppercase">
                                {title}
                            </h2>
                        </div>
                    {:else}
                        <div class="h-2.5 shrink-0"></div>
                    {/if}

                    <div
                        data-vaul-no-drag
                        class={`mx-2 mb-2 min-h-0 flex-1 overflow-x-hidden overflow-y-auto rounded-xl border border-black bg-linear-to-b ${contentBg} shadow-[0_0_0_1px_#000,inset_0_2px_4px_rgba(255,255,255,0.4)] [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden`}
                    >
                        <div class={cn("w-full p-4 text-stone-900", contentClass)}>
                            {@render children()}
                        </div>
                    </div>
                </div>
            </Drawer.Content>
        </Drawer.Portal>
    </Drawer.Root>
{:else}
    <Popover.Root bind:open positioning={{ placement, offset: { mainAxis: 16, crossAxis: 0 } }} {onOpenChange}>
        <Popover.Trigger class={cn("cursor-pointer border-none bg-transparent outline-none", className)}>
            {@render trigger()}
        </Popover.Trigger>

        <Portal>
            <Popover.Positioner class={cn("absolute", zIndex)}>
                <Popover.Content
                    class={cn(
                        "relative flex max-h-[calc(var(--available-height)-10rem)] flex-col overflow-hidden rounded-[20px] border border-black outline-none",
                        "transition-all duration-200 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95",
                        "shadow-[0_0_0_1px_#000,0_0_0_2px_#000,0_8px_24px_rgba(0,0,0,0.5)]",
                        zIndex,
                    )}
                >
                    <span class={`absolute inset-0 bg-linear-to-b ${v.bg}`}></span>
                    <span class={`absolute inset-0.5 rounded-[18px] bg-linear-to-b ${v.overlay} opacity-80`}></span>
                    <span class={`absolute inset-x-1.5 top-1.5 h-1/2 rounded-[14px] bg-linear-to-b ${v.gloss} opacity-70`}></span>

                    <div class="relative z-10 flex min-h-0 w-full flex-1 flex-col">
                        {#if title}
                            <div class="flex shrink-0 items-center justify-center p-3 pt-5 pb-3">
                                <h2 class="text-shadow font-coc text-2xl font-black tracking-wider text-white uppercase">
                                    {title}
                                </h2>
                            </div>
                        {:else}
                            <div class="h-2.5 shrink-0"></div>
                        {/if}

                        <div
                            class={`mx-2 mb-2 min-h-0 flex-1 overflow-x-hidden overflow-y-auto rounded-xl border border-black bg-linear-to-b ${contentBg} shadow-[0_0_0_1px_#000,inset_0_2px_4px_rgba(255,255,255,0.4)] [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden`}
                        >
                            <div class={cn("w-full p-4 text-stone-900", maxWidth, contentClass)}>
                                {@render children()}
                            </div>
                        </div>
                    </div>
                </Popover.Content>
            </Popover.Positioner>
        </Portal>
    </Popover.Root>
{/if}

<style>
    .text-shadow {
        text-shadow:
            0 -2px #000,
            0 0 #000,
            0 2px #000,
            0 4px #000,
            -1px -1px #000,
            1px -1px #000,
            1px 0 #000,
            -1px 0 #000,
            1px 1px #000,
            -1px 1px #000,
            1px 2px #000,
            -1px 2px #000;
    }
</style>
