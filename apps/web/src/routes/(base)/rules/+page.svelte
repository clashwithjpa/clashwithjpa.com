<script lang="ts">
    import CocBand from "$lib/components/ui/coc/CocBand.svelte";
    import CocBtn from "$lib/components/ui/coc/CocBtn.svelte";
    import CocCard from "$lib/components/ui/coc/CocCard.svelte";
    import Seo from "$lib/components/ui/Seo.svelte";
    import { cn } from "$lib/utils";
    import { LINKS } from "$lib/utils/links";
    import { createSectionSpy } from "$lib/utils/section-spy.svelte";
    import { PreRendered } from "carta-md";
    import SimpleIconsDiscord from "~icons/simple-icons/discord";
    import type { PageProps } from "./$types";

    let { data }: PageProps = $props();

    const spy = createSectionSpy(() => data.sections.map((s) => s.id));
</script>

<Seo
    title="Rules"
    description="Discover the official rules and guidelines for JPA FWA Clans. Learn about member conduct, war rules, and more to ensure a positive gaming experience."
/>

<div class="-mx-2 p-0! md:-mx-4 lg:-mx-8">
    <CocBand
        ribbon="Playbook"
        title="JPA Rules"
        description="The shared playbook for our family of clans. Read it before applying, most strikes happen because someone skimmed."
    />

    <div class="mx-auto max-w-7xl px-4 pt-16 pb-24 md:px-6 md:pt-20 lg:px-8">
        <div class="grid grid-cols-1 gap-6 lg:grid-cols-[300px_1fr]">
            <aside class="flex animate-in flex-col gap-4 duration-800 ease-glide fill-mode-both fade-in lg:sticky lg:top-28 lg:self-start">
                {#if data.sections.length}
                    <CocCard contentClass="flex flex-col gap-1 p-3">
                        <nav class="flex flex-col gap-1">
                            {#each data.sections as section (section.id)}
                                <a
                                    href="#{section.id}"
                                    onclick={(e) => spy.go(e, section.id)}
                                    class={cn(
                                        "cursor-pointer rounded-lg border px-3 py-2 text-left font-coc text-sm font-bold transition-colors duration-200 ease-in-out outline-none",
                                        spy.activeId === section.id
                                            ? "text-white coc-slot"
                                            : "border-transparent text-parchment/80 hover:bg-black/20 hover:text-white",
                                    )}
                                >
                                    <span class="block truncate">{section.title}</span>
                                </a>
                            {/each}
                        </nav>
                    </CocCard>
                {/if}

                <CocCard contentClass="flex flex-col gap-3 p-5">
                    <span class="font-coc text-xs font-bold tracking-[0.2em] text-parchment/70 uppercase">Need a human?</span>
                    <p class="font-coc text-sm text-parchment/80">
                        If you have questions about the rules or want to report an issue, please reach out to us on Discord.
                    </p>
                    <CocBtn variant="blurple" size="sm" class="w-full" href={LINKS.discord} target="_blank">
                        <SimpleIconsDiscord />
                        <span>Open Discord</span>
                    </CocBtn>
                </CocCard>
            </aside>

            <main class="flex animate-in flex-col gap-4 duration-800 ease-glide fill-mode-both fade-in">
                {#if data.sections.length}
                    {#each data.sections as section (section.id)}
                        <section id={section.id} class="scroll-mt-28">
                            <CocCard variant="panel" contentClass="p-6 md:p-8">
                                <h2 class="mb-6 font-coc text-2xl font-black tracking-wide text-white text-outline md:text-3xl">
                                    <a
                                        href="#{section.id}"
                                        onclick={(e) => spy.go(e, section.id)}
                                        class="transition-colors duration-200 ease-in-out hover:text-parchment/70"
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
                    <CocCard variant="panel" contentClass="flex flex-col items-center gap-2 p-10 text-center">
                        <p class="font-coc text-lg font-bold text-white">No rules have been published yet.</p>
                    </CocCard>
                {/if}
            </main>
        </div>
    </div>
</div>
