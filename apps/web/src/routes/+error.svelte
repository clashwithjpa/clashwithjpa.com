<script lang="ts">
    import { page } from "$app/state";
    import { signInWithDiscord } from "$lib/auth";
    import CocBtn from "$lib/components/ui/coc/CocBtn.svelte";
    import CocCard from "$lib/components/ui/coc/CocCard.svelte";
    import Seo from "$lib/components/ui/Seo.svelte";
    import { LINKS } from "$lib/utils/links";
    import SimpleIconsDiscord from "~icons/simple-icons/discord";

    type Scene = { art: "goblin-sign" | "goblin-facepalm" | "fallen-king"; title: string; quips: string[] };

    const SCENES: Record<"missing" | "denied" | "broken" | "other", Scene> = {
        missing: {
            art: "goblin-sign",
            title: "This page got looted",
            quips: [
                "A goblin got here first. Every last byte, gone.",
                "We scouted every base in the war. This one doesn't exist.",
                "Not even the Clan Castle troops could find it.",
            ],
        },
        denied: {
            art: "goblin-facepalm",
            title: "Domain Expansion: Restricted Area",
            quips: [
                "Throughout heaven and earth, only the right roles may pass. Yours isn't one of them. Yet.",
                "You walked straight into the domain. The sure-hit is a 403.",
            ],
        },
        broken: {
            art: "fallen-king",
            title: "The server fell in battle",
            quips: [
                "The Warden's holding the umbrella while our builders revive it. Give it a moment.",
                "Two stars, zero percent. Something broke on our side, not yours.",
            ],
        },
        other: {
            art: "goblin-sign",
            title: "That attack didn't land",
            quips: ["Something about this request made the goblins nervous. Try again from the village."],
        },
    };

    const status = $derived(page.status);
    const scene = $derived(
        status === 404 ? SCENES.missing : status === 401 || status === 403 ? SCENES.denied : status >= 500 ? SCENES.broken : SCENES.other,
    );
    // Keyed on the path so the line is stable across server and client renders.
    const quip = $derived(scene.quips[[...page.url.pathname].reduce((h, c) => h + c.charCodeAt(0), 0) % scene.quips.length]);
    // "Whoops!" is the generic message hooks.client.ts gives unexpected errors.
    const detail = $derived(
        page.error?.message && !["Not Found", "Internal Error", "Forbidden", "Unauthorized", "Whoops!"].includes(page.error.message)
            ? page.error.message
            : null,
    );
</script>

<Seo title={`${status} · ${scene.title}`} description={quip} />

<main class="relative isolate flex size-full items-center justify-center overflow-y-auto bg-stone-950 px-4 py-10 font-coc">
    <img src="/bg.webp" alt="" class="fixed inset-0 -z-20 size-full object-cover opacity-25 blur-sm" />
    <div class="fixed inset-0 -z-10 bg-[radial-gradient(circle_at_center,transparent_0%,var(--color-stone-950)_75%)]"></div>

    <CocCard class="w-full max-w-3xl" contentClass="grid items-center gap-6 p-6 md:grid-cols-[minmax(0,16rem)_1fr] md:gap-8 md:p-8">
        <div class="@container relative mx-auto w-48 md:w-full">
            {#if scene.art === "goblin-sign"}
                <img src="/art/goblin-sign.webp" alt="A goblin holding up a sign" class="w-full select-none" />
                <!-- The blank sign, measured on the source art. -->
                <span
                    class="absolute top-[0.7%] left-[24%] grid h-[31.2%] w-[52%] place-items-center font-coc text-[19cqw] leading-none font-black text-[#3b2416]"
                >
                    {status}
                </span>
            {:else if scene.art === "goblin-facepalm"}
                <img
                    src="/art/goblin-facepalm.webp"
                    alt="A goblin facepalming next to a hog"
                    class="w-full rounded-xl border border-black shadow-[0_0_0_1px_#000]"
                />
            {:else}
                <img
                    src="/art/fallen-king.webp"
                    alt="The Grand Warden holding an umbrella over a fallen Barbarian King"
                    class="w-full rounded-xl border border-black shadow-[0_0_0_1px_#000]"
                />
            {/if}
        </div>

        <div class="flex flex-col items-center gap-4 text-center md:items-start md:text-left">
            <span class="rounded-md bg-[#3b2416] px-2 py-0.5 text-xs font-bold tracking-widest text-[#ffcd6a] uppercase">Error {status}</span>
            <h1 class="text-3xl leading-tight font-black text-white text-outline md:text-4xl">{scene.title}</h1>
            <p class="text-base text-parchment/85">{quip}</p>
            {#if detail}
                <p class="rounded-lg px-3 py-2 font-mono text-xs break-all text-parchment/70 coc-slot">{detail}</p>
            {/if}
            {#if status >= 500 && page.error?.errorId}
                <p class="font-mono text-xs text-parchment/50">Error ID: {page.error.errorId}</p>
            {/if}
            <div class="flex flex-wrap items-center justify-center gap-3 pt-2 md:justify-start">
                <CocBtn variant="green" size="sm" href="/">Back to the village</CocBtn>
                {#if status === 401}
                    <CocBtn variant="blurple" size="sm" onclick={() => signInWithDiscord()}>
                        <SimpleIconsDiscord /> Sign in
                    </CocBtn>
                {:else if status >= 500}
                    <CocBtn variant="orange" size="sm" onclick={() => location.reload()}>Try again</CocBtn>
                    <CocBtn variant="blurple" size="sm" href={LINKS.discord} target="_blank"><SimpleIconsDiscord /> Report it</CocBtn>
                {:else}
                    <CocBtn variant="orange" size="sm" onclick={() => history.back()}>Go back</CocBtn>
                {/if}
            </div>
        </div>
    </CocCard>
</main>
