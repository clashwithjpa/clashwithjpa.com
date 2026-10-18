<script lang="ts">
    import { afterNavigate } from "$app/navigation";
    import { page } from "$app/state";
    import { sidebarStore } from "$lib/components/ui/sidebar";
    import { cn } from "$lib/utils";
    import { createMobileMediaQuery } from "$lib/utils/mobile";
    import { storage } from "$lib/utils/storage.svelte";
    import { onMount, tick } from "svelte";
    import { fade, fly } from "svelte/transition";
    import TablerBuildingCastle from "~icons/tabler/building-castle";
    import { ACTIVITIES, type ActivityDef } from "./activities";
    import { island } from "./island.svelte";
    import { PAGES } from "./pages";
    import { SOURCES } from "./sources";

    for (const start of SOURCES) start();

    const IDLE = 56;
    const DRAG_THRESHOLD = 6;
    const SWIPE_THRESHOLD = 48;

    let shell = $state<HTMLDivElement>();
    let content = $state<HTMLDivElement>();
    let size = $state({ w: IDLE, h: IDLE });
    let pageIndex = $state(0);
    let pageDir = $state(1);
    let isMobile = $state(false);

    onMount(() => createMobileMediaQuery((mobile) => (isMobile = mobile), "lg"));

    // The island grows out of the corner it sits in, so measure the
    // content and let the shell animate to that size.
    $effect(() => {
        if (!content) return;
        const el = content;
        const observer = new ResizeObserver(() => (size = { w: el.offsetWidth, h: el.offsetHeight }));
        observer.observe(el);
        return () => observer.disconnect();
    });

    let current = $derived(island.current);
    let view = $derived(island.expanded ? "cover" : (current?.id ?? "idle"));
    // Admin and dashboard pages have a bottom nav bar on small screens.
    let lifted = $derived(isMobile && /^\/(admin|dashboard)(\/|$)/.test(page.url.pathname));
    let left = $derived(storage.islandSide === "left");

    afterNavigate(() => (island.expanded = false));

    // On wide screens the admin details panel takes the right edge, so the island
    // moves to just left of it instead of covering its footer.
    let panelOffset = $state(0);
    $effect(() => {
        void page.url.pathname;
        if (!sidebarStore.isOpen || isMobile || left) {
            panelOffset = 0;
            return;
        }
        // NOTE: tied to the Splitter panel id in routes/(auth)/+layout.svelte.
        const panel = document.querySelector<HTMLElement>('[data-part="panel"][data-id="infosidebar"]');
        if (!panel) return;
        const measure = () => (panelOffset = panel.offsetWidth ? innerWidth - panel.getBoundingClientRect().left : 0);
        const observer = new ResizeObserver(measure);
        observer.observe(panel);
        measure();
        return () => observer.disconnect();
    });

    // Drag anywhere, then snap to the nearer bottom corner on release. The top
    // corners are taken by the navbar and page headers. Moves are tracked on the
    // window so a quick flick that outruns the island still counts.
    let dragging = $state(false);
    let offset = $state({ x: 0, y: 0 });
    let swallowClick = false;

    function onPointerDown(e: PointerEvent) {
        if (island.expanded || e.button !== 0) return;
        const from = { x: e.clientX, y: e.clientY, id: e.pointerId };

        const move = (ev: PointerEvent) => {
            if (ev.pointerId !== from.id) return;
            const x = ev.clientX - from.x;
            const y = ev.clientY - from.y;
            if (!dragging && Math.hypot(x, y) < DRAG_THRESHOLD) return;
            dragging = true;
            offset = { x, y };
        };
        const end = (ev: PointerEvent) => {
            if (ev.pointerId !== from.id) return;
            window.removeEventListener("pointermove", move);
            window.removeEventListener("pointerup", end);
            window.removeEventListener("pointercancel", end);
            if (dragging) void snap(ev.type === "pointercancel");
        };
        window.addEventListener("pointermove", move);
        window.addEventListener("pointerup", end);
        window.addEventListener("pointercancel", end);
    }

    async function snap(cancelled: boolean) {
        if (!shell) return;
        // The click that ends a drag shouldn't also open the cover.
        swallowClick = true;
        setTimeout(() => (swallowClick = false));
        const before = shell.getBoundingClientRect();
        if (!cancelled) storage.islandSide = before.left + before.width / 2 < innerWidth / 2 ? "left" : "right";
        dragging = false;
        offset = { x: 0, y: 0 };
        await tick();
        const after = shell.getBoundingClientRect();
        shell.animate([{ translate: `${before.left - after.left}px ${before.top - after.top}px` }, { translate: "0 0" }], {
            duration: matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 320,
            easing: "cubic-bezier(0.33, 1, 0.68, 1)",
        });
    }

    function onClick() {
        if (swallowClick) return;
        const def: ActivityDef | undefined = current ? ACTIVITIES[current.kind] : undefined;
        if (!island.expanded && current && def?.dismissOnClick) island.dismiss(current.id);
        else island.expanded = !island.expanded;
    }

    function onKeydown(e: KeyboardEvent) {
        if (e.target !== shell || (e.key !== "Enter" && e.key !== " ")) return;
        e.preventDefault();
        onClick();
    }

    function showPage(i: number) {
        pageDir = i > pageIndex ? 1 : -1;
        pageIndex = (i + PAGES.length) % PAGES.length;
    }

    let swipeX: number | null = null;
    function onCoverPointerUp(e: PointerEvent) {
        if (swipeX == null) return;
        const dx = e.clientX - swipeX;
        swipeX = null;
        if (Math.abs(dx) > SWIPE_THRESHOLD) showPage(pageIndex + (dx < 0 ? 1 : -1));
    }

    // Close on outside clicks and Escape. Clicks inside popups and dialogs opened
    // from the cover (customize, clear cache) are portaled, so they're let through.
    $effect(() => {
        if (!island.expanded) return;
        const onDown = (e: PointerEvent) => {
            const target = e.target;
            if (
                !(target instanceof Element) ||
                shell?.contains(target) ||
                target.closest('[data-part="positioner"], [data-part="content"], [data-part="backdrop"]')
            )
                return;
            island.expanded = false;
        };
        const onKey = (e: KeyboardEvent) => {
            const typing = e.target instanceof Element && e.target.closest("input, textarea, [contenteditable]");
            if (e.key === "Escape") island.expanded = false;
            else if (!typing && e.key === "ArrowRight") showPage(pageIndex + 1);
            else if (!typing && e.key === "ArrowLeft") showPage(pageIndex - 1);
        };
        document.addEventListener("pointerdown", onDown, true);
        document.addEventListener("keydown", onKey);
        return () => {
            document.removeEventListener("pointerdown", onDown, true);
            document.removeEventListener("keydown", onKey);
        };
    });
</script>

{#snippet activity()}
    {#if current}
        {@const Activity = (ACTIVITIES[current.kind] as ActivityDef).component}
        <Activity {...current.props} />
    {/if}
{/snippet}

<div
    class={cn("fixed z-60 transition-[right] duration-300 ease-glide", lifted ? "bottom-20" : "bottom-4", left ? "left-4" : "right-4")}
    style:right={panelOffset ? `${panelOffset + 16}px` : undefined}
    style:translate={dragging ? `${offset.x}px ${offset.y}px` : undefined}
>
    <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
    <div
        bind:this={shell}
        role={island.expanded ? "dialog" : "button"}
        aria-label={island.expanded ? "Quick menu" : "Open quick menu"}
        tabindex="0"
        class={cn(
            "relative overflow-clip rounded-[28px] bg-stone-900 font-rubik shadow-2xl ring-2 ring-stone-700/50 outline-none focus-visible:ring-4 focus-visible:ring-stone-700/50",
            "transition-[width,height] duration-400 ease-glide motion-reduce:transition-none",
            !island.expanded && "cursor-pointer touch-none",
            dragging && "cursor-grabbing transition-none",
        )}
        style:width="{size.w}px"
        style:height="{size.h}px"
        onclick={onClick}
        onkeydown={onKeydown}
        onpointerdown={onPointerDown}
    >
        <div
            bind:this={content}
            class={cn(
                "absolute grid w-max max-w-[calc(100vw-2rem)]",
                "bottom-0 items-end",
                left ? "left-0 justify-items-start" : "right-0 justify-items-end",
            )}
        >
            {#key view}
                <div class="[grid-area:1/1]" in:fade={{ delay: 120, duration: 180 }} out:fade={{ duration: 80 }}>
                    {#if view === "cover"}
                        <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
                        <div
                            class="flex w-80 max-w-full flex-col gap-3 p-3"
                            onclick={(e) => e.stopPropagation()}
                            onpointerdown={(e) => (swipeX = (e.target as Element).closest('input, [data-scope="slider"]') ? null : e.clientX)}
                            onpointerup={onCoverPointerUp}
                        >
                            {#if current}
                                <div class="-mx-3 -mt-3 border-b-2 border-stone-700/50">{@render activity()}</div>
                            {/if}
                            <div class="flex items-center justify-between gap-2 px-1">
                                <span class="text-xs font-medium tracking-wide text-stone-400 uppercase">{PAGES[pageIndex]!.label}</span>
                                <div class="flex items-center gap-1">
                                    {#each PAGES as p, i (p.id)}
                                        <button
                                            type="button"
                                            class="grid size-4 cursor-pointer place-items-center"
                                            aria-label="Show {p.label}"
                                            aria-current={i === pageIndex}
                                            onclick={() => showPage(i)}
                                        >
                                            <span
                                                class={cn(
                                                    "size-1.5 rounded-full transition-colors",
                                                    i === pageIndex ? "bg-stone-100" : "bg-stone-600",
                                                )}
                                            ></span>
                                        </button>
                                    {/each}
                                </div>
                            </div>
                            {#key pageIndex}
                                {@const Page = PAGES[pageIndex]!.component}
                                <div in:fly={{ x: 16 * pageDir, duration: 200 }}>
                                    <Page />
                                </div>
                            {/key}
                        </div>
                    {:else if current}
                        {@render activity()}
                    {:else}
                        <div class="grid size-14 place-items-center text-stone-200">
                            <TablerBuildingCastle class="pointer-events-none size-6" />
                        </div>
                    {/if}
                </div>
            {/key}
        </div>
    </div>
</div>
