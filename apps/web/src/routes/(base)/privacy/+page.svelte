<script lang="ts">
    import { replaceState } from "$app/navigation";
    import CocBtn from "$lib/components/ui/coc/CocBtn.svelte";
    import CocCard from "$lib/components/ui/coc/CocCard.svelte";
    import H1 from "$lib/components/ui/coc/H1.svelte";
    import Seo from "$lib/components/ui/Seo.svelte";
    import { cn } from "$lib/utils";
    import TablerMailFilled from "~icons/tabler/mail-filled";

    const CONTROLLER = "JPA";
    const CONTACT_EMAIL = "privacy@clashwithjpa.com";
    const LAST_UPDATED = "15 August 2026";

    const sections = [
        {
            id: "who-we-are",
            title: "Who we are",
            body: `${CONTROLLER} operates clashwithjpa.com, the website of the JPA Clash of Clans clan family. We determine what member data this site collects and the purposes for which it is used, and are therefore the data controller for that information. Enquiries and requests concerning your data should be directed to ${CONTACT_EMAIL}.`,
        },
        {
            id: "what-we-collect",
            title: "What we collect",
            list: [
                "Discord account information. Signing in provides us with your Discord user ID, username, display name, avatar and email address. Your membership and roles in the JPA Discord server are read separately, by our own Discord bot.",
                "Clash of Clans account data. The player tags you link, together with in-game statistics retrieved for them — town hall level, donations given and received, clan games participation, capital gold contributions, war weight and current clan.",
                "Application records. The information you submit when applying to a clan or to a CWL roster, including your clan preferences, together with any notes recorded by clan staff during review.",
                "Session records. Technical details associated with each sign-in, including network and browser information, so that active sessions can be managed and misuse investigated.",
                "Activity records. An audit log of administrative actions performed on the site, and request logs for any API key issued to you.",
            ],
        },
        {
            id: "why",
            title: "Why we use it, and on what basis",
            body: "We process this data in our legitimate interests in operating an organised clan community: confirming Discord identity, determining clan and CWL placement, monitoring war and donation performance, maintaining the security of the site, and holding staff accountable for administrative actions. Where you ask us for something specific, such as submitting an application or issuing an API key, the data is processed in order to fulfil that request. We do not use personal data for advertising, we do not sell or otherwise disclose it for commercial purposes, and we do not carry out automated decision-making that produces legal effects for you.",
        },
        {
            id: "sharing",
            title: "Who else sees it",
            list: [
                "Discord — authentication is performed through Discord, and our Discord bot reads role and membership information from the community server.",
                "Supercell — we query the official Clash of Clans API for the player tags you link.",
                "Sentry — our error monitoring. When a fault occurs, a report is sent containing the affected page and the technical details of the error.",
                "Cloudflare — the Turnstile anti-automation check is loaded from Cloudflare when you submit a clan application.",
                "Our hosting provider — operates the servers and database on which this site runs.",
            ],
            footer: "Certain of these providers operate outside the United Kingdom and the EEA. Where that is the case, transfers rely on the safeguards those providers have implemented, such as standard contractual clauses.",
        },
        {
            id: "retention",
            title: "How long we keep it",
            body: "Account details and linked Clash of Clans data are retained for as long as your account remains active. Session records are retained until the session expires. Application records are retained for the season to which they relate, and for a reasonable period afterwards so that placement decisions can be reviewed. Administrative audit logs are retained for longer, as their purpose is accountability: they record which staff member performed which action, and are deliberately preserved when the corresponding account is removed. On deletion of your account we remove your profile and linked game data; audit entries identifying you are retained for that accountability purpose.",
        },
        {
            id: "your-rights",
            title: "Your rights",
            body:
                "If you are located in the United Kingdom or the EEA, data protection law entitles you to request a copy of the personal data we hold about you, to have it corrected or erased, to restrict or object to our use of it, and to receive it in a portable format. This includes any notes recorded by clan staff in relation to your application. Requests should be sent to " +
                CONTACT_EMAIL +
                ", and we will respond within one month. If you are dissatisfied with how we handle a request, you may lodge a complaint with your national supervisory authority; in the United Kingdom this is the Information Commissioner's Office (ico.org.uk).",
        },
        {
            id: "analytics",
            title: "Visitor statistics",
            body: "Site usage is measured using analytics software hosted on our own infrastructure, and the resulting statistics are not shared with any external analytics provider. It records the pages visited, the sources visitors arrive from, outbound links followed, and general characteristics such as browser, device type and country. It sets no cookies and does not track visitors across other websites. Rather than storing a persistent identifier, it derives one from a key that is regenerated each day and then discarded, so activity cannot be linked from one day to the next. We do this in our legitimate interest in understanding how the site is used.",
        },
        {
            id: "cookies",
            title: "Cookies",
            body: "We use cookies solely to keep you signed in. These are strictly necessary for the site to function, and are therefore set without consent. We set no advertising cookies, and our visitor statistics operate without cookies entirely, which is why no cookie banner is presented.",
        },
        {
            id: "changes",
            title: "Changes",
            body: `We will update this policy when our handling of personal data changes. This version was last updated on ${LAST_UPDATED}.`,
        },
    ];

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
        const els = sections.map((s) => document.getElementById(s.id)).filter((el): el is HTMLElement => !!el);
        if (!els.length) return;

        // Jump to the section referenced by the initial URL hash, if any.
        const initial = decodeURIComponent(location.hash.slice(1));
        if (initial && sections.some((s) => s.id === initial)) {
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
            <CocCard contentClass="flex flex-col gap-1 p-3">
                <nav class="flex flex-col gap-1">
                    {#each sections as section (section.id)}
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

            <CocCard variant="dark" contentClass="flex flex-col gap-3 p-5">
                <span class="font-coc text-xs font-bold tracking-[0.2em] text-stone-700 uppercase">Questions?</span>
                <p class="font-coc text-sm text-stone-800">
                    For questions about this policy, or to exercise your rights over your data, contact
                    <a class="font-bold underline" href="mailto:{CONTACT_EMAIL}" target="_blank" rel="noopener noreferrer">{CONTACT_EMAIL}</a>.
                </p>
                <CocBtn size="sm" class="w-full" href="mailto:{CONTACT_EMAIL}" target="_blank">
                    <TablerMailFilled />
                    <span>Mail us</span>
                </CocBtn>
            </CocCard>
        </aside>

        <main class="flex flex-col gap-4">
            {#each sections as section, i (section.id)}
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

                        {#if section.body}
                            <p class="text-sm leading-relaxed md:text-base">{section.body}</p>
                        {/if}

                        {#if section.list}
                            <ul class="flex list-disc flex-col gap-2 pl-5 text-sm leading-relaxed md:text-base">
                                {#each section.list as item (item)}
                                    <li>{item}</li>
                                {/each}
                            </ul>
                        {/if}

                        {#if section.footer}
                            <p class="text-sm leading-relaxed md:text-base">{section.footer}</p>
                        {/if}
                    </CocCard>
                </section>
            {/each}
        </main>
    </div>
</div>
