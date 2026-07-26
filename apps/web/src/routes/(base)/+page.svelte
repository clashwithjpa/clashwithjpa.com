<script lang="ts">
    import FamilyStats from "$lib/components/coc/FamilyStats.svelte";
    import CocBtn from "$lib/components/ui/coc/CocBtn.svelte";
    import CocCard from "$lib/components/ui/coc/CocCard.svelte";
    import H1 from "$lib/components/ui/coc/H1.svelte";
    import Icon from "$lib/components/ui/Icon.svelte";
    import Seo from "$lib/components/ui/Seo.svelte";
    import { LINKS } from "$lib/utils/links";
    import SimpleIconsDiscord from "~icons/simple-icons/discord";
    import type { PageProps } from "./$types";

    let { data }: PageProps = $props();

    const features = [
        {
            icon: "labels/friendlywars",
            title: "Guaranteed wars",
            body: "Synchronized 50v50 FWA wars back-to-back. There's always a base waiting for your attacks.",
        },
        {
            icon: "labels/clanwarleague",
            title: "CWL every season",
            body: "Ten clans spread across the leagues, a Clan War League roster for every town hall level.",
        },
        {
            icon: "labels/farming",
            title: "Loot, not drama",
            body: "War-farming keeps storages full and builders busy. No forced pushes, no rushed-base shaming.",
        },
        {
            icon: "labels/international",
            title: "A real community",
            body: "An active Discord, hands-on leaders, and players clashing from every corner of the map.",
        },
    ];

    const floatingSprites = [
        { src: "electro_dragon", position: "top-24 left-[4%] w-28 md:top-28 md:w-36 lg:w-44", distance: 22, duration: 4200, delay: 0 },
        { src: "dragon_duke", position: "top-16 right-[2%] w-40 md:w-56 lg:w-72", distance: 18, duration: 5000, delay: 300 },
        { src: "neutral_noshadow", position: "bottom-20 left-[6%] w-36 md:w-48 lg:w-60", distance: 26, duration: 4600, delay: 600 },
        { src: "broom_witch_anime", position: "bottom-16 right-[6%] w-36 md:w-48 lg:w-60", distance: 20, duration: 4800, delay: 900 },
    ];
</script>

<Seo
    title="Home"
    description="JPA is a family of ten Fair War Alliance clans running synchronized 50v50 FWA wars and CWL every season. Live clan stats, guaranteed wars, and steady loot. Find your clan today."
/>

<div class="-mx-2 p-0! md:-mx-4 lg:-mx-8">
    <!-- Ambient hero backdrop -->
    <img src="/bg.webp" alt="" class="fixed inset-0 -z-20 size-full object-cover" />
    <div class="fixed inset-0 -z-10 bg-[radial-gradient(circle_at_center,rgba(0,0,0,0.35)_0%,rgba(0,0,0,0.65)_65%,rgba(0,0,0,0.9)_100%)]"></div>

    <!-- HERO -->
    <section class="relative flex min-h-[calc(100dvh-5rem)] flex-col items-center justify-center gap-6 px-4 py-16 text-center">
        {#each floatingSprites as sprite}
            <img
                src="/sprites/{sprite.src}.webp"
                alt=""
                class="pointer-events-none absolute z-0 hidden animate-float-sprite drop-shadow-[0_20px_30px_rgba(0,0,0,0.5)] select-none md:block {sprite.position}"
                style="--float-distance:{sprite.distance}px; --float-duration:{sprite.duration}ms; --float-delay:{sprite.delay}ms"
            />
        {/each}

        <H1 class="text-5xl font-bold md:text-7xl lg:text-8xl">
            <span class="animate-in duration-800 ease-glide fill-mode-both fade-in">Clash With</span>
            <span class="inline-flex">
                {#each "JPA" as char, i}
                    <span class="inline-block overflow-hidden">
                        <span class="glide-char inline-block" style="--i:{i}">{char}</span>
                    </span>
                {/each}
            </span>
        </H1>

        <p class="max-w-2xl font-coc text-base text-stone-200 md:text-xl">
            <span class="desc"> FWA experts in War-Farming, </span>
            <span class="desc"> offering diverse clans and simultaneous 50v50 FWA wars and CWL action. </span>
            <snap class="desc"> Join one of the clans in our family today! </snap>
        </p>

        <div class="flex flex-wrap items-center justify-center gap-4 pt-2">
            <a href="/clans" class="animate-in duration-800 ease-glide fill-mode-both fade-in">
                <CocBtn variant="green">Explore the clans</CocBtn>
            </a>
            <a href={LINKS.discord} target="_blank" class="animate-in delay-150 duration-800 ease-glide fill-mode-both fade-in">
                <CocBtn variant="blurple"><SimpleIconsDiscord /> Join Discord</CocBtn>
            </a>
        </div>

        <div class="absolute bottom-4 flex animate-in flex-col items-center gap-1 duration-800 ease-glide fill-mode-both fade-in">
            <span class="font-coc text-xs tracking-widest text-stone-400 uppercase">Scroll to explore</span>
            <div class="h-8 w-5 rounded-full border-2 border-stone-500/60 p-1">
                <div class="mx-auto h-2 w-1 animate-bounce rounded-full bg-stone-400"></div>
            </div>
        </div>

        <!-- Blend the hero into the dark content below -->
        <div class="pointer-events-none absolute inset-x-0 bottom-0 z-0 h-40 bg-linear-to-b from-transparent to-stone-950"></div>
    </section>

    <!-- LIVE DATA -->
    <section class="relative z-0 bg-stone-950 pb-20">
        <div class="mx-auto flex max-w-7xl flex-col gap-20 px-4 md:px-6 lg:px-8">
            <div>
                <div class="mb-8 flex flex-col items-center gap-3 text-center">
                    <span class="font-coc text-xs font-bold tracking-[0.3em] text-[#ffcd6a] uppercase">The numbers don't lie</span>
                    <h2 class="font-coc text-3xl font-black text-stone-100 md:text-5xl">Inside the family</h2>
                    <p class="max-w-2xl font-coc text-sm text-stone-400 md:text-base">Live stats from our family of clans</p>
                </div>
                <FamilyStats clanTags={data.clanTags} />
            </div>

            <!-- WHY JPA -->
            <div>
                <div class="mb-8 flex flex-col items-center gap-3 text-center">
                    <span class="font-coc text-xs font-bold tracking-[0.3em] text-[#ffcd6a] uppercase">Why fight with us</span>
                    <h2 class="font-coc text-3xl font-black text-stone-100 md:text-5xl">Built for war-farmers</h2>
                </div>
                <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {#each features as feature}
                        <CocCard variant="dark" class="h-full" contentClass="flex flex-col gap-3 p-5">
                            <Icon name={feature.icon} class="size-14 drop-shadow-[0_2px_2px_rgba(0,0,0,0.6)]" />
                            <h3 class="font-coc text-lg font-black text-stone-900">{feature.title}</h3>
                            <p class="font-coc text-sm leading-relaxed text-stone-700">{feature.body}</p>
                        </CocCard>
                    {/each}
                </div>
            </div>

            <!-- FINAL CTA -->
            <CocCard
                variant="dark"
                class="mx-auto w-full max-w-3xl origin-center transform transition-all duration-200 hover:scale-102"
                contentClass="flex flex-col items-center gap-5 p-8 text-center md:p-12"
            >
                <h2 class="font-coc text-3xl font-black tracking-wide text-stone-900 text-shadow-sm md:text-5xl">Ready to march?</h2>
                <p class="max-w-xl font-coc text-sm text-stone-700 md:text-base">
                    Submit your application, tell us your town hall and stats, and we'll slot you into the clan that fits. Wars start the day you're
                    accepted.
                </p>
                <div class="flex flex-wrap items-center justify-center gap-4">
                    <CocBtn variant="orange" href="/dashboard/apply">Apply now</CocBtn>
                    <CocBtn variant="blurple" href={LINKS.discord} target="_blank"><SimpleIconsDiscord /> Join Discord</CocBtn>
                    <CocBtn variant="green" href="/clans">Browse clans</CocBtn>
                </div>
            </CocCard>
        </div>
    </section>
</div>

<style>
    .text-shadow-sm {
        text-shadow:
            0 1px 2px rgba(0, 0, 0, 0.3),
            0 2px 4px rgba(0, 0, 0, 0.2);
    }
</style>
