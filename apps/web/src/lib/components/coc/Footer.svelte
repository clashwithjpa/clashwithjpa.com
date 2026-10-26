<script lang="ts">
    import CocBtn from "#lib/components/ui/coc/CocBtn.svelte";
    import { cn } from "#lib/utils.js";
    import { LINKS, NAV_LINKS } from "#lib/utils/links.js";
    import { page } from "$app/state";
    import { onMount } from "svelte";
    import SimpleIconsDiscord from "~icons/simple-icons/discord";

    const year = new Date().getFullYear();
    const links = [...NAV_LINKS, { name: "Privacy", href: "/privacy" }];

    // An homage to the game's loading-screen tips. Jokes only: nothing here should read as an actual FWA rule.
    const TIPS = [
        "Walls don't upgrade themselves. We checked.",
        "Elixir is not a beverage. Please stop.",
        "Your builder isn't on strike. He's on a very long break.",
        "The Giant asked for Giants, not Wall Breakers. Read the request.",
        "Both attacks count. Yes, the second one too.",
        "Hog Riders don't knock. You don't have to either, just apply.",
        "A goblin can't read, but he can definitely count gold.",
        "The Grand Warden's book has the rules. So does ours, and ours is shorter.",
        "Training troops for an hour, then forgetting to attack, is a lifestyle.",
        "Your Clan Castle troops are 'on their way'. Sure they are.",
        "Every base is a farming base if you believe hard enough.",
        "The Archer Queen saw that you skipped war. She remembers.",
    ];

    let tip = $state<number | null>(null);
    onMount(() => (tip = Math.floor(Math.random() * TIPS.length)));
    const nextTip = () => (tip = ((tip ?? 0) + 1 + Math.floor(Math.random() * (TIPS.length - 1))) % TIPS.length);

    const PER_CLICK = 100;
    const CAPACITY = 1500;
    let gold = $state(0);
    let pops = $state<{ id: number; text: string }[]>([]);
    let popId = 0;
    const full = $derived(gold >= CAPACITY);
    const goldLine = $derived(
        gold === 0
            ? ""
            : full
              ? "Storage full. Go attack someone."
              : gold >= 800
                ? `${gold.toLocaleString("en-US")} gold. Spend it on walls.`
                : `${gold.toLocaleString("en-US")} gold collected`,
    );

    function collect() {
        const text = full ? "FULL" : `+${PER_CLICK}`;
        gold = Math.min(gold + PER_CLICK, CAPACITY);
        pops.push({ id: ++popId, text });
    }

    const isActive = (href: string) => (href === "/" ? page.url.pathname === "/" : page.url.pathname.startsWith(href));
</script>

<footer class="relative mt-24 font-coc">
    <!-- The board hangs below the page with a plank top edge; the shadow sits on the wrapper because the mask would clip it. -->
    <div class="board-shadow pointer-events-none absolute inset-x-0 -top-5 bottom-0" aria-hidden="true">
        <div class="plank-top size-full coc-wood"></div>
    </div>

    <div class="absolute -top-16 right-4 md:right-12">
        <button
            type="button"
            onclick={collect}
            aria-label="Collect gold from the storage"
            class="relative block size-20 cursor-pointer transition-[filter] duration-200 hover:brightness-110 active:brightness-90 md:size-24"
        >
            <img
                src="/art/gold-storage.webp"
                alt=""
                class="size-full object-contain drop-shadow-[0_6px_6px_rgba(0,0,0,0.5)] select-none"
                draggable="false"
            />
            {#each pops as pop (pop.id)}
                <span
                    class="gold-pop pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 text-lg font-black text-[#ffcd6a] text-outline"
                    onanimationend={() => (pops = pops.filter((p) => p.id !== pop.id))}
                >
                    {pop.text}
                </span>
            {/each}
        </button>
        <p class="absolute top-full right-0 mt-1 w-max max-w-48 text-right text-xs text-parchment/80" aria-live="polite">{goldLine}</p>
    </div>

    <div class="relative mx-auto grid max-w-7xl gap-10 px-4 pt-14 pb-10 md:grid-cols-[1.5fr_1fr_1fr] md:px-6 lg:px-8">
        <div class="flex flex-col gap-5">
            <a href="/" class="flex w-fit items-center gap-3">
                <img src="/logo.webp" alt="" class="size-12 drop-shadow-[0_2px_2px_rgba(0,0,0,0.5)]" />
                <span class="flex flex-col">
                    <span class="text-xl leading-tight font-black text-white text-outline">JPA</span>
                    <span class="text-xs text-parchment/75">FWA Clans</span>
                </span>
            </a>

            <div class="flex max-w-md flex-col gap-2 rounded-xl p-3 coc-slot">
                <div class="flex items-center justify-between gap-2">
                    <span
                        class="rounded-md border border-black bg-linear-to-b from-[#ffcd6a] to-[#e68e2e] px-2 py-0.5 text-[0.65rem] font-black tracking-wider text-white uppercase text-outline"
                    >
                        Tip
                    </span>
                    <button
                        type="button"
                        onclick={nextTip}
                        class="cursor-pointer text-xs text-parchment/70 transition-colors duration-200 hover:text-white"
                    >
                        Next tip
                    </button>
                </div>
                <p class="min-h-10 text-sm leading-snug text-parchment" aria-live="polite">
                    {#if tip !== null}
                        {#key tip}
                            <span class="animate-in duration-300 fade-in">{TIPS[tip]}</span>
                        {/key}
                    {/if}
                </p>
            </div>
        </div>

        <nav class="flex flex-col gap-3" aria-label="Footer">
            <h4 class="text-xs font-bold tracking-[0.18em] text-parchment/70 uppercase">Explore</h4>
            <ul class="flex flex-col gap-2">
                {#each links as link (link.href)}
                    <li>
                        <a
                            href={link.href}
                            aria-current={isActive(link.href) ? "page" : undefined}
                            class={cn(
                                "text-sm transition-colors duration-200 hover:text-white",
                                isActive(link.href) ? "text-white text-outline" : "text-parchment/80",
                            )}
                        >
                            {link.name}
                        </a>
                    </li>
                {/each}
            </ul>
        </nav>

        <div class="flex flex-col gap-3">
            <h4 class="text-xs font-bold tracking-[0.18em] text-parchment/70 uppercase">Join the family</h4>
            <p class="max-w-xs text-sm text-parchment/80">
                A family of clans, one Discord, and wars that never stop. There's a seat for your town hall.
            </p>
            <div class="flex flex-wrap gap-2">
                <CocBtn variant="orange" size="sm" href="/dashboard/apply">Apply now</CocBtn>
                <CocBtn variant="blurple" size="sm" href={LINKS.discord} target="_blank"><SimpleIconsDiscord /> Discord</CocBtn>
            </div>
        </div>
    </div>

    <div class="relative border-t border-black/30">
        <div
            class="mx-auto flex max-w-7xl flex-col items-center gap-2 px-4 py-5 text-center text-xs text-parchment/60 md:flex-row md:justify-between md:px-6 md:text-left lg:px-8"
        >
            <span>© {year} JPA · Fuelled by a questionable amount of elixir.</span>
            <span class="max-w-xl">
                This material is unofficial and is not endorsed by Supercell. For more information see
                <a
                    href="https://supercell.com/en/fan-content-policy/"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="underline underline-offset-2 transition-colors duration-200 hover:text-white">Supercell's Fan Content Policy</a
                >. Town Hall images by
                <a
                    href="https://github.com/ClashKingInc/ClashKingAssets"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="underline underline-offset-2 transition-colors duration-200 hover:text-white">ClashKing</a
                >.
            </span>
        </div>
    </div>
</footer>

<style>
    .board-shadow {
        filter: drop-shadow(0 -2px 0 #1a0f0a) drop-shadow(0 -6px 10px rgba(0, 0, 0, 0.4));
    }

    .gold-pop {
        animation: gold-pop 800ms var(--ease-glide) both;
    }

    @keyframes gold-pop {
        from {
            opacity: 1;
            translate: 0 0;
        }
        to {
            opacity: 0;
            translate: 0 -2.5rem;
        }
    }

    @keyframes gold-pop-fade {
        to {
            opacity: 0;
        }
    }

    @media (prefers-reduced-motion: reduce) {
        .gold-pop {
            animation-name: gold-pop-fade;
        }
    }
</style>
