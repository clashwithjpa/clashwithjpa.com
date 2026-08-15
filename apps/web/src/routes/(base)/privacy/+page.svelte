<script lang="ts">
    import { replaceState } from "$app/navigation";
    import CocBtn from "$lib/components/ui/coc/CocBtn.svelte";
    import CocCard from "$lib/components/ui/coc/CocCard.svelte";
    import H1 from "$lib/components/ui/coc/H1.svelte";
    import Seo from "$lib/components/ui/Seo.svelte";
    import { cn } from "$lib/utils";
    import { PreRendered } from "carta-md";
    import TablerMailFilled from "~icons/tabler/mail-filled";
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
</script>

<Seo
    title="Privacy"
    description="How JPA collects, uses and protects the personal data of members who sign in to clashwithjpa.com, and the rights you have over it."
/>

<div class="container mx-auto flex min-h-screen flex-col gap-8">
    <div class="flex flex-col items-center gap-4 text-center">
        <H1 class="animate-in text-4xl text-white duration-800 ease-glide fill-mode-both fade-in md:text-6xl">Privacy Policy</H1>
        <p
            class="max-w-2xl animate-in font-coc text-lg text-stone-200 duration-200 ease-glide fill-mode-both fade-in slide-in-from-bottom md:text-xl"
        >
            How we handle the personal data of members who use this site, and the rights you hold over it.
        </p>
    </div>

    <div class="grid grid-cols-1 gap-6 lg:grid-cols-[300px_1fr]">
        <aside class="flex animate-in flex-col gap-4 duration-800 ease-glide fill-mode-both fade-in lg:sticky lg:top-28 lg:self-start">
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
                <span class="font-coc text-xs font-bold tracking-[0.2em] text-stone-700 uppercase">Questions?</span>
                {#if data.email}
                    <p class="font-coc text-sm text-stone-800">
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
                        <CocCard contentClass="flex flex-col gap-3 p-6 text-stone-900 md:p-8">
                            <h2 class="font-coc text-2xl font-black tracking-wide md:text-3xl">
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
                    <p class="font-coc text-lg font-bold text-stone-900">No privacy policy has been published yet.</p>
                </CocCard>
            {/if}
        </main>
    </div>
</div>
