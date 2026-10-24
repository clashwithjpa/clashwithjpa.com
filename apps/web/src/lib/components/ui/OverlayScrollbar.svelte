<script lang="ts">
    import { cn } from "$lib/utils";

    interface Props {
        viewport: HTMLElement | null | undefined;
        /** Pixels at the top of the viewport the vertical track skips, e.g. a sticky table header. */
        insetTop?: number;
        /** `coc` matches the public pages' PageScrollbar thumb. */
        tone?: "stone" | "coc";
    }

    let { viewport, insetTop = 0, tone = "stone" }: Props = $props();

    type Axis = "x" | "y";
    const AXES: Axis[] = ["y", "x"];

    const MIN_THUMB = 32;
    const IDLE_MS = 900;
    const EDGE_PX = 12;
    const PAD = 4;

    let enabled = $state(false);
    let frame = $state({ top: 0, left: 0, width: 0, height: 0 });
    let bars = $state({
        y: { scrollable: false, start: 0, size: 0 },
        x: { scrollable: false, start: 0, size: 0 },
    });
    let active = $state({ x: false, y: false });
    let nearEdge = $state({ x: false, y: false });
    let overThumb = $state({ x: false, y: false });
    let dragging = $state<Axis | null>(null);
    const visible = (axis: Axis) => bars[axis].scrollable && (active[axis] || nearEdge[axis] || overThumb[axis] || dragging === axis);

    const trackLength = (axis: Axis) => (axis === "y" ? frame.height : frame.width) - PAD * 2;

    function update(el: HTMLElement) {
        frame = {
            top: el.offsetTop + el.clientTop + insetTop,
            left: el.offsetLeft + el.clientLeft,
            width: el.clientWidth,
            height: el.clientHeight - insetTop,
        };
        const measure = (axis: Axis, client: number, total: number, offset: number) => {
            const scrollable = total > client + 1;
            if (!scrollable) return { scrollable, start: 0, size: 0 };
            const track = trackLength(axis);
            const size = Math.max(MIN_THUMB, (client / total) * track);
            return { scrollable, size, start: (offset / (total - client)) * (track - size) };
        };
        bars = {
            y: measure("y", el.clientHeight, el.scrollHeight, el.scrollTop),
            x: measure("x", el.clientWidth, el.scrollWidth, el.scrollLeft),
        };
    }

    $effect(() => {
        const el = viewport;
        // Touch devices already get a native overlay scrollbar, so only replace it for mouse users.
        if (!el || !window.matchMedia("(pointer: fine)").matches) return;
        enabled = true;
        el.dataset.overlayScrollbar = "";

        let raf = 0;
        const schedule = () => (raf ||= requestAnimationFrame(() => ((raf = 0), update(el))));
        const idle: Record<Axis, ReturnType<typeof setTimeout> | undefined> = { x: undefined, y: undefined };
        let last = { top: el.scrollTop, left: el.scrollLeft };

        const wake = (axis: Axis) => {
            active[axis] = true;
            clearTimeout(idle[axis]);
            idle[axis] = setTimeout(() => (active[axis] = false), IDLE_MS);
        };
        const onScroll = () => {
            schedule();
            if (el.scrollTop !== last.top) wake("y");
            if (el.scrollLeft !== last.left) wake("x");
            last = { top: el.scrollTop, left: el.scrollLeft };
        };
        const onPointerMove = (e: PointerEvent) => {
            if (e.pointerType !== "mouse") return;
            const rect = el.getBoundingClientRect();
            const y = rect.right - e.clientX <= EDGE_PX;
            const x = rect.bottom - e.clientY <= EDGE_PX;
            if (y !== nearEdge.y || x !== nearEdge.x) {
                nearEdge = { x, y };
                if (x || y) schedule();
            }
        };
        const onPointerLeave = () => (nearEdge = { x: false, y: false });

        schedule();
        el.addEventListener("scroll", onScroll, { passive: true });
        el.addEventListener("pointermove", onPointerMove, { passive: true });
        el.addEventListener("pointerleave", onPointerLeave);
        const observer = new ResizeObserver(schedule);
        observer.observe(el);

        return () => {
            delete el.dataset.overlayScrollbar;
            el.removeEventListener("scroll", onScroll);
            el.removeEventListener("pointermove", onPointerMove);
            el.removeEventListener("pointerleave", onPointerLeave);
            observer.disconnect();
            clearTimeout(idle.x);
            clearTimeout(idle.y);
            cancelAnimationFrame(raf);
            enabled = false;
        };
    });

    function startDrag(axis: Axis, event: PointerEvent) {
        const el = viewport;
        if (!el) return;
        event.preventDefault();
        const thumb = event.currentTarget as HTMLElement;
        thumb.setPointerCapture(event.pointerId);
        dragging = axis;
        const startPointer = axis === "y" ? event.clientY : event.clientX;
        const startScroll = axis === "y" ? el.scrollTop : el.scrollLeft;
        const range = axis === "y" ? el.scrollHeight - el.clientHeight : el.scrollWidth - el.clientWidth;
        const ratio = range / (trackLength(axis) - bars[axis].size);

        const move = (e: PointerEvent) => {
            const delta = ((axis === "y" ? e.clientY : e.clientX) - startPointer) * ratio;
            el.scrollTo({ [axis === "y" ? "top" : "left"]: startScroll + delta, behavior: "instant" });
        };
        const end = () => {
            dragging = null;
            thumb.removeEventListener("pointermove", move);
            thumb.removeEventListener("pointerup", end);
            thumb.removeEventListener("pointercancel", end);
        };
        thumb.addEventListener("pointermove", move);
        thumb.addEventListener("pointerup", end);
        thumb.addEventListener("pointercancel", end);
    }

    const thumbClass = (axis: Axis) =>
        cn(
            "pointer-events-auto absolute cursor-grab rounded-full transition-[opacity,width,height,background-color] duration-300",
            tone === "coc" ? "border border-black/50 bg-parchment/40 hover:bg-parchment/60" : "bg-stone-600/60 hover:bg-stone-500/80",
            axis === "y" ? "right-0.5 w-1.5 hover:w-2.5" : "bottom-0.5 h-1.5 hover:h-2.5",
            dragging === axis && cn("cursor-grabbing", tone === "coc" ? "bg-parchment/70" : "bg-stone-400/80", axis === "y" ? "w-2.5" : "h-2.5"),
            !visible(axis) && "pointer-events-none opacity-0",
        );
</script>

{#if enabled && (bars.y.scrollable || bars.x.scrollable)}
    <div
        class="pointer-events-none absolute z-30"
        style="top: {frame.top}px; left: {frame.left}px; width: {frame.width}px; height: {frame.height}px"
        aria-hidden="true"
    >
        {#each AXES as axis (axis)}
            {#if bars[axis].scrollable}
                <div
                    class={thumbClass(axis)}
                    style={axis === "y"
                        ? `top: ${PAD + bars.y.start}px; height: ${bars.y.size}px`
                        : `left: ${PAD + bars.x.start}px; width: ${bars.x.size}px`}
                    role="presentation"
                    onpointerenter={() => (overThumb[axis] = true)}
                    onpointerleave={() => (overThumb[axis] = false)}
                    onpointerdown={(e) => startDrag(axis, e)}
                ></div>
            {/if}
        {/each}
    </div>
{/if}
