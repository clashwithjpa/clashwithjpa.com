<script lang="ts">
    import H1 from "$lib/components/ui/coc/H1.svelte";
    import Ribbon from "$lib/components/ui/coc/Ribbon.svelte";
    import Icon from "$lib/components/ui/Icon.svelte";

    let {
        ribbon,
        title,
        description,
        stats = [],
    }: {
        ribbon: string;
        title: string;
        description: string;
        stats?: { icon: string; label: string; value: string }[];
    } = $props();

    const BAND = "#3a2314";
    const EDGE =
        "M0 0H1440V12L1390 22 1336 11 1284 19 1230 9 1180 24 1126 12 1075 21 1022 7 970 17 920 10 866 23 815 11 760 19 712 9 660 22 610 12 556 20 500 6 455 18 400 10 352 24 300 12 250 18 196 8 150 20 96 10 48 22 0 14Z";
</script>

<!-- Runs up under the translucent navbar. The torn edge is drawn in the band's own colour. -->
<section class="relative -mt-20 pt-20" style="background-color: {BAND}">
    <div class="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_30%_0%,rgba(255,190,120,0.16),transparent_60%)]"></div>
    <div class="relative mx-auto flex max-w-7xl flex-col gap-5 px-4 pt-10 pb-12 md:px-6 md:pt-16 md:pb-16 lg:px-8">
        <div class="hero-rise" style="--i:0"><Ribbon>{ribbon}</Ribbon></div>
        <div class="hero-rise" style="--i:1">
            <H1 class="text-5xl text-white md:text-7xl">{title}</H1>
        </div>
        <p class="hero-rise max-w-2xl font-coc text-base text-parchment md:text-lg" style="--i:2">{description}</p>

        {#if stats.length}
            <dl class="hero-rise mt-2 grid max-w-3xl grid-cols-2 gap-2 md:grid-cols-4" style="--i:3">
                {#each stats as stat (stat.label)}
                    <div
                        class="flex items-center gap-3 rounded-xl border border-black/50 bg-black/25 px-3 py-2.5 shadow-[inset_0_2px_6px_rgba(0,0,0,0.45)]"
                    >
                        <Icon name={stat.icon} class="size-8 drop-shadow-[0_2px_2px_rgba(0,0,0,0.6)]" />
                        <div class="flex min-w-0 flex-col">
                            {#key stat.value}
                                <dd
                                    class="animate-in truncate font-coc text-lg leading-tight font-black text-white tabular-nums duration-500 fade-in text-outline"
                                >
                                    {stat.value}
                                </dd>
                            {/key}
                            <dt class="font-coc text-[0.65rem] font-bold tracking-wider text-parchment/70 uppercase">{stat.label}</dt>
                        </div>
                    </div>
                {/each}
            </dl>
        {/if}
    </div>

    <svg class="absolute inset-x-0 top-full h-5 w-full md:h-7" viewBox="0 0 1440 28" preserveAspectRatio="none" aria-hidden="true">
        <path fill="#5c3820" transform="translate(0 4)" d={EDGE} />
        <path fill={BAND} d={EDGE} />
    </svg>
</section>
