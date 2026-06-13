<script lang="ts">
    import { replaceState } from "$app/navigation";
    import CocBtn from "$lib/components/ui/coc/CocBtn.svelte";
    import CocCard from "$lib/components/ui/coc/CocCard.svelte";
    import H1 from "$lib/components/ui/coc/H1.svelte";
    import Seo from "$lib/components/ui/Seo.svelte";
    import { cn } from "$lib/utils";
    import { fadeIn, fadeUp } from "$lib/utils/animations";
    import { LINKS } from "$lib/utils/links";
    import { PreRendered } from "carta-md";
    import SimpleIconsDiscord from "~icons/simple-icons/discord";
    import type { PageProps } from "./$types";
    let { data }: PageProps = $props();

    let activeId = $state("");

    function setHash(id: string) {
        if (typeof history !== "undefined") replaceState(`#${id}`, {});
    }

    function navigate(event: MouseEvent, id: string) {
        event.preventDefault();
        document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
        activeId = id;
        setHash(id);
    }

    $effect(() => {
        const els = data.sections.map((s) => document.getElementById(s.id)).filter((el): el is HTMLElement => !!el);
        if (!els.length) return;

        // Jump to the section referenced by the initial URL hash, if any.
        const initial = decodeURIComponent(location.hash.slice(1));
        if (initial && data.sections.some((s) => s.id === initial)) {
            document.getElementById(initial)?.scrollIntoView({ block: "start" });
            activeId = initial;
        }

        const observer = new IntersectionObserver(
            (entries) => {
                const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
                if (visible[0]) {
                    activeId = visible[0].target.id;
                    setHash(activeId);
                }
            },
            { rootMargin: "-30% 0px -60% 0px", threshold: 0 },
        );
        els.forEach((el) => observer.observe(el));
        return () => observer.disconnect();
    });

    $effect(() => {
        fadeIn(document.querySelector(".page-title") as HTMLElement);
        fadeUp(document.querySelector(".page-desc") as HTMLElement);
        fadeIn(document.querySelector(".rules-aside") as HTMLElement);
        fadeIn(document.querySelector(".rules-content") as HTMLElement);
    });
</script>

<Seo
    title="Rules"
    description="
            Discover the official rules and guidelines for JPA FWA Clans. Learn about member conduct, war rules, and more to ensure a positive gaming
            experience."
/>

<div class="container mx-auto flex min-h-screen flex-col gap-8">
    <div class="flex flex-col items-center gap-4 text-center">
        <H1 class="page-title text-4xl opacity-0 md:text-6xl">JPA Rules</H1>
        <p class="page-desc max-w-2xl font-coc text-lg text-stone-200 opacity-0 md:text-xl">
            The shared playbook for our family of clans. Read it before applying, most strikes happen because someone skimmed.
        </p>
    </div>

    <div class="grid grid-cols-1 gap-6 lg:grid-cols-[300px_1fr]">
        <aside class="rules-aside flex flex-col gap-4 opacity-0 lg:sticky lg:top-28 lg:self-start">
            {#if data.sections.length}
                <CocCard contentClass="flex flex-col gap-1 p-3">
                    <nav class="flex flex-col gap-1">
                        {#each data.sections as section (section.id)}
                            <a
                                href="#{section.id}"
                                onclick={(e) => navigate(e, section.id)}
                                class={cn(
                                    "cursor-pointer rounded-lg px-3 py-2 text-left font-coc text-sm font-bold transition-colors duration-200 ease-in-out outline-none",
                                    activeId === section.id
                                        ? "bg-stone-900/15 text-stone-900 inset-shadow-sm shadow-stone-900"
                                        : "text-stone-800 hover:bg-stone-900/10 hover:text-stone-900",
                                )}
                            >
                                <span class="block truncate">{section.title}</span>
                            </a>
                        {/each}
                    </nav>
                </CocCard>
            {/if}

            <CocCard variant="dark" contentClass="flex flex-col gap-3 p-5">
                <span class="font-coc text-xs font-bold tracking-[0.2em] text-stone-700 uppercase">Need a human?</span>
                <p class="font-coc text-sm text-stone-800">
                    If you have questions about the rules or want to report an issue, please reach out to us on Discord.
                </p>
                <CocBtn variant="blurple" size="sm" class="w-full" href={LINKS.discord} target="_blank">
                    <SimpleIconsDiscord />
                    <span>Open Discord</span>
                </CocBtn>
            </CocCard>
        </aside>

        <main class="rules-content flex flex-col gap-4 opacity-0">
            {#if data.sections.length}
                {#each data.sections as section (section.id)}
                    <section id={section.id} class="scroll-mt-28">
                        <CocCard contentClass="p-6 md:p-8">
                            <h2 class="mb-6 font-coc text-2xl font-black tracking-wide text-stone-900 md:text-3xl">
                                <a
                                    href="#{section.id}"
                                    onclick={(e) => navigate(e, section.id)}
                                    class="transition-colors duration-200 ease-in-out hover:text-stone-700"
                                >
                                    {section.title}
                                </a>
                            </h2>
                            <div class="typography-coc">
                                <PreRendered html={section.html} />
                            </div>
                        </CocCard>
                    </section>
                {/each}
            {:else}
                <CocCard contentClass="flex flex-col items-center gap-2 p-10 text-center">
                    <p class="font-coc text-lg font-bold text-stone-900">No rules have been published yet.</p>
                </CocCard>
            {/if}
        </main>
    </div>
</div>
