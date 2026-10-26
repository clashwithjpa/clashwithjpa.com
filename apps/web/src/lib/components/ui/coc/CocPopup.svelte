<script lang="ts">
    import { cn } from "#lib/utils.js";
    import { createMobileMediaQuery } from "#lib/utils/mobile.js";
    import { Drawer } from "@ark-ui/svelte/drawer";
    import { Popover } from "@ark-ui/svelte/popover";
    import { Portal } from "@ark-ui/svelte/portal";
    import { onMount, type Snippet } from "svelte";

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
        onOpenChange?: (details: Drawer.OpenChangeDetails | Popover.OpenChangeDetails) => void;
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

    // A width-capped popup always "fits" on its side, so the positioner never flips it even when
    // the other side has far more room. Side placements pick their side on open instead: keep the
    // requested side if a full-size popup fits there, else take the roomier one.
    const FULL_WIDTH = 448;
    let side = $state<string | null>(null);
    const resolvedPlacement = $derived((side ?? placement) as typeof placement);

    function pickSide(event: Event) {
        const [wanted, align] = placement.split("-");
        if (wanted !== "left" && wanted !== "right") return;
        const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
        const room = { left: rect.left, right: window.innerWidth - rect.right };
        const other = wanted === "left" ? "right" : "left";
        const chosen = room[wanted] >= FULL_WIDTH || room[wanted] >= room[other] ? wanted : other;
        side = align ? `${chosen}-${align}` : chosen;
    }

    const scrollArea = "min-h-0 flex-1 overflow-x-hidden overflow-y-auto scrollbar-none [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden";
</script>

{#snippet heading()}
    {#if title}
        <div class="flex shrink-0 items-center justify-center border-b-2 border-black/60 px-4 pt-4 pb-3 shadow-[0_1px_0_rgba(255,255,255,0.06)]">
            <h2 class="font-coc text-2xl font-black tracking-wider text-white uppercase text-outline">{title}</h2>
        </div>
    {:else}
        <div class="h-2.5 shrink-0"></div>
    {/if}
{/snippet}

{#if isMobile}
    <Drawer.Root bind:open {onOpenChange}>
        <Drawer.Trigger>
            <div class={cn("cursor-pointer border-none bg-transparent outline-none", className)}>
                {@render trigger()}
            </div>
        </Drawer.Trigger>

        <Portal>
            <Drawer.Backdrop
                class={cn(
                    "pointer-events-auto fixed inset-0 bg-stone-950/60 backdrop-blur-sm transition-all duration-200",
                    "data-[state=closed]:animate-out data-[state=open]:animate-in",
                    "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
                    "z-9999",
                )}
            />

            <Drawer.Positioner class={cn("pointer-events-none fixed inset-0 z-9999 flex items-end justify-center")}>
                <Drawer.Content
                    class={cn(
                        "pointer-events-auto relative flex max-h-[calc(100vh-6rem)] w-full max-w-2xl flex-col overflow-hidden rounded-t-[24px] border-b-0! coc-panel outline-none focus:outline-none",
                        "transition-all duration-200 data-[state=closed]:animate-out data-[state=open]:animate-in",
                        "data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom",
                    )}
                >
                    {@render heading()}
                    <div class={scrollArea}>
                        <div class={cn("w-full p-4 font-coc text-parchment", contentClass)}>
                            {@render children()}
                        </div>
                    </div>
                </Drawer.Content>
            </Drawer.Positioner>
        </Portal>
    </Drawer.Root>
{:else}
    <Popover.Root bind:open positioning={{ placement: resolvedPlacement, offset: { mainAxis: 16, crossAxis: 0 } }} {onOpenChange}>
        <Popover.Trigger
            class={cn("cursor-pointer border-none bg-transparent outline-none", className)}
            onpointerdown={pickSide}
            onkeydown={pickSide}
        >
            {@render trigger()}
        </Popover.Trigger>

        <Portal>
            <Popover.Positioner class={cn("fixed transform-none", zIndex)}>
                <Popover.Content
                    class={cn(
                        "relative flex max-h-[calc(var(--available-height)-10rem)] max-w-[calc(var(--available-width)-0.5rem)] flex-col overflow-hidden rounded-[24px] coc-panel outline-none",
                        "transition-all duration-200 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95",
                        zIndex,
                    )}
                >
                    {@render heading()}
                    <div class={scrollArea}>
                        <div class={cn("w-full p-4 font-coc text-parchment", maxWidth, contentClass)}>
                            {@render children()}
                        </div>
                    </div>
                </Popover.Content>
            </Popover.Positioner>
        </Portal>
    </Popover.Root>
{/if}
