<script lang="ts">
    import CocCard from "$lib/components/ui/coc/CocCard.svelte";
    import Icon from "$lib/components/ui/Icon.svelte";
    import { cn } from "$lib/utils";

    let {
        value = null,
        label,
        icon,
        suffix = "",
        loading = false,
        delay = 0,
        class: className = "",
    }: {
        value?: number | null;
        label: string;
        icon: string;
        suffix?: string;
        loading?: boolean;
        delay?: number;
        class?: string;
    } = $props();

    let display = $state(0);

    const format = (n: number) => new Intl.NumberFormat("en-US").format(Math.round(n));

    $effect(() => {
        if (loading || value == null) return;
        const target = value;
        const duration = 1600;
        let frame = 0;
        let start = 0;

        const step = (now: number) => {
            start ||= now + delay;
            const t = Math.min(Math.max((now - start) / duration, 0), 1);
            display = target * (1 - Math.pow(1 - t, 3));
            if (t < 1) frame = requestAnimationFrame(step);
        };

        frame = requestAnimationFrame(step);
        return () => cancelAnimationFrame(frame);
    });
</script>

<CocCard
    variant="dark"
    class={cn("h-full origin-center transform transition-all duration-200 hover:scale-102", className)}
    contentClass="flex items-center gap-3 p-3 md:gap-4 md:p-4"
>
    <Icon name={icon} class="size-9 drop-shadow-[0_2px_2px_rgba(0,0,0,0.6)] md:size-11" />
    <div class="flex min-w-0 flex-1 flex-col">
        {#if loading}
            <span class="my-1 h-6 w-16 animate-pulse rounded bg-stone-900/10 md:h-8 md:w-20"></span>
            <span class="h-3 w-20 animate-pulse rounded bg-stone-900/10 md:w-24"></span>
        {:else}
            <span class="stat-number font-coc text-lg leading-none font-black text-stone-900 sm:text-xl md:text-2xl lg:text-3xl">
                {value == null ? "—" : format(display)}{suffix}
            </span>
            <span class="mt-1 font-coc text-[0.65rem] leading-tight font-bold tracking-wide text-stone-700 uppercase md:text-xs">
                {label}
            </span>
        {/if}
    </div>
</CocCard>

<style>
    .stat-number {
        text-shadow:
            0 1px 2px rgba(0, 0, 0, 0.3),
            0 2px 4px rgba(0, 0, 0, 0.2);
    }
</style>
