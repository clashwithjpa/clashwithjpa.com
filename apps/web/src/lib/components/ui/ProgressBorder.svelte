<script lang="ts">
    import { cn } from "$lib/utils";

    // A rounded-rect outline that fills clockwise from the top centre. Place it in
    // a positioned parent and pass that box's live size, since the stroke sits
    // `stroke` px outside it, over the spot a `ring` of the same width would take.
    let {
        width,
        height,
        value,
        radius,
        stroke = 2,
        class: className,
    }: { width: number; height: number; value: number; radius: number; stroke?: number; class?: string } = $props();

    let path = $derived.by(() => {
        const o = stroke / 2;
        const [x0, y0, x1, y1] = [o, o, o + width + stroke, o + height + stroke];
        const r = Math.min(radius + o, (x1 - x0) / 2, (y1 - y0) / 2);
        return [
            `M ${(x0 + x1) / 2} ${y0}`,
            `H ${x1 - r} A ${r} ${r} 0 0 1 ${x1} ${y0 + r}`,
            `V ${y1 - r} A ${r} ${r} 0 0 1 ${x1 - r} ${y1}`,
            `H ${x0 + r} A ${r} ${r} 0 0 1 ${x0} ${y1 - r}`,
            `V ${y0 + r} A ${r} ${r} 0 0 1 ${x0 + r} ${y0} Z`,
        ].join(" ");
    });
</script>

<svg
    class="pointer-events-none absolute overflow-visible"
    style:inset="-{stroke}px"
    width={width + stroke * 2}
    height={height + stroke * 2}
    fill="none"
    aria-hidden="true"
>
    <path
        d={path}
        pathLength="1"
        class={cn("stroke-lime-400 transition-[stroke-dashoffset] duration-300 ease-linear motion-reduce:transition-none", className)}
        stroke-width={stroke}
        stroke-linecap="round"
        stroke-dasharray="1"
        stroke-dashoffset={1 - Math.min(Math.max(value, 0), 1)}
    />
</svg>
