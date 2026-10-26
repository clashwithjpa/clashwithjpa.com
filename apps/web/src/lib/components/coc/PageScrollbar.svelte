<script lang="ts">
    import { cn } from "#lib/utils.js";
    import { onMount } from "svelte";

    const MIN_THUMB = 40;
    const IDLE_MS = 900;

    let enabled = $state(false);
    let thumb = $state({ top: 0, height: 0 });
    let scrollable = $state(false);
    let active = $state(false);
    let hovering = $state(false);
    let dragging = $state(false);
    const visible = $derived(scrollable && (active || hovering || dragging));

    let idleTimer: ReturnType<typeof setTimeout> | undefined;
    let frame = 0;

    function update() {
        frame = 0;
        const { scrollHeight, clientHeight } = document.documentElement;
        scrollable = scrollHeight > clientHeight + 1;
        if (!scrollable) return;
        const height = Math.max(MIN_THUMB, (clientHeight / scrollHeight) * clientHeight);
        const progress = window.scrollY / (scrollHeight - clientHeight);
        thumb = { height, top: progress * (clientHeight - height) };
    }

    const schedule = () => (frame ||= requestAnimationFrame(update));

    function onScroll() {
        schedule();
        active = true;
        clearTimeout(idleTimer);
        idleTimer = setTimeout(() => (active = false), IDLE_MS);
    }

    function startDrag(event: PointerEvent) {
        event.preventDefault();
        const el = event.currentTarget as HTMLElement;
        el.setPointerCapture(event.pointerId);
        dragging = true;
        const startY = event.clientY;
        const startScroll = window.scrollY;
        const { scrollHeight, clientHeight } = document.documentElement;
        const ratio = (scrollHeight - clientHeight) / (clientHeight - thumb.height);

        const move = (e: PointerEvent) => window.scrollTo({ top: startScroll + (e.clientY - startY) * ratio, behavior: "instant" });
        const end = () => {
            dragging = false;
            el.removeEventListener("pointermove", move);
            el.removeEventListener("pointerup", end);
            el.removeEventListener("pointercancel", end);
        };
        el.addEventListener("pointermove", move);
        el.addEventListener("pointerup", end);
        el.addEventListener("pointercancel", end);
    }

    onMount(() => {
        // Touch devices already get a native overlay scrollbar, so only replace it for mouse users.
        if (!window.matchMedia("(pointer: fine)").matches) return;
        enabled = true;
        const root = document.documentElement;
        root.classList.add("overlay-scrollbar");

        update();
        window.addEventListener("scroll", onScroll, { passive: true });
        window.addEventListener("resize", schedule);
        const observer = new ResizeObserver(schedule);
        observer.observe(document.body);

        return () => {
            root.classList.remove("overlay-scrollbar");
            window.removeEventListener("scroll", onScroll);
            window.removeEventListener("resize", schedule);
            observer.disconnect();
            clearTimeout(idleTimer);
            cancelAnimationFrame(frame);
        };
    });
</script>

{#if enabled && scrollable}
    <!-- A 12px strip down the right edge reveals the thumb on hover; nothing on the page sits that close to the edge. -->
    <div
        class="fixed inset-y-0 right-0 z-50 w-3"
        role="presentation"
        onpointerenter={() => (hovering = true)}
        onpointerleave={() => (hovering = false)}
    >
        <div
            class={cn(
                "absolute right-0.5 w-1.5 cursor-grab rounded-full border border-black/50 bg-parchment/40 transition-[opacity,width,background-color] duration-300 hover:w-2.5 hover:bg-parchment/60",
                dragging && "w-2.5 cursor-grabbing bg-parchment/70",
                visible ? "opacity-100" : "pointer-events-none opacity-0",
            )}
            style="top: {thumb.top}px; height: {thumb.height}px"
            role="presentation"
            onpointerdown={startDrag}
        ></div>
    </div>
{/if}
