<script lang="ts">
    import CocBand from "#lib/components/ui/coc/CocBand.svelte";
    import CocBtn from "#lib/components/ui/coc/CocBtn.svelte";
    import CocCard from "#lib/components/ui/coc/CocCard.svelte";
    import Seo from "#lib/components/ui/Seo.svelte";
    import { cn } from "#lib/utils.js";
    import { createSectionSpy } from "#lib/utils/section-spy.svelte.js";
    import { page } from "$app/state";
    import { PreRendered } from "carta-md";
    import TablerMailFilled from "~icons/tabler/mail-filled";
    import type { PageProps } from "./$types";

    let { data }: PageProps = $props();

    const spy = createSectionSpy(() => data.sections.map((s) => s.id));
</script>

<Seo
    title="Privacy Policy"
    description="How JPA collects, uses and protects the personal data of members who sign in to clashwithjpa.com with Discord, and the rights you have over that data."
    extraButtons={false}
    buttons={[{ label: "Read the policy", url: `${page.url.origin}/privacy`, emoji: "🔒" }]}
/>

<div class="-mx-2 p-0! md:-mx-4 lg:-mx-8">
    <CocBand
        ribbon="Your data"
        title="Privacy Policy"
        description="How we handle the personal data of members who use this site, and the rights you hold over it."
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
                    <span class="font-coc text-xs font-bold tracking-[0.2em] text-parchment/70 uppercase">Questions?</span>
                    {#if data.email}
                        <p class="font-coc text-sm text-parchment/80">
                            For questions about this policy, or to exercise your rights over your data, contact
                            <a class="font-bold underline" href="mailto:{data.email}" target="_blank" rel="noopener noreferrer">{data.email}</a>.
                        </p>
                        <CocBtn size="sm" class="w-full" href="mailto:{data.email}" target="_blank">
                            <TablerMailFilled />
                            <span>Mail us</span>
                        </CocBtn>
                    {/if}
                </CocCard>
            </aside>

            <main class="flex flex-col gap-4">
                {#if data.sections.length}
                    {#each data.sections as section, i (section.id)}
                        <section id={section.id} class="stagger-card scroll-mt-28" style="--i:{i}">
                            <CocCard variant="panel" contentClass="flex flex-col gap-3 p-6 text-white md:p-8">
                                <h2 class="font-coc text-2xl font-black tracking-wide text-outline md:text-3xl">
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
                        <p class="font-coc text-lg font-bold text-white">No privacy policy has been published yet.</p>
                    </CocCard>
                {/if}
            </main>
        </div>
    </div>
</div>
