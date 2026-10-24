<script lang="ts">
    import { page } from "$app/state";
    import {
        actionRow,
        container,
        hexToAccentColor,
        linkButton,
        mediaGallery,
        serializeComponentEmbed,
        textDisplay,
        type ComponentEmbedPayload,
        type Container,
        type LinkButton,
    } from "$lib/discord/component-embed";
    import { LINKS } from "$lib/utils/links";

    interface Props {
        title?: string;
        description?: string;
        image?: string;
        imageAlt?: string;
        /** Buttons on the Discord card. Apply and Discord are added after these unless `extraButtons` is false. */
        buttons?: { label: string; url: string; emoji?: string }[];
        extraButtons?: boolean;
        noindex?: boolean;
        embed?: Container;
    }
    let {
        title = "",
        description = "",
        image = "/og.jpg",
        imageAlt = "Clash With JPA key art: the JPA crest over a Clash of Clans battle under a blood moon",
        buttons = [],
        extraButtons = true,
        noindex = false,
        embed,
    }: Props = $props();

    const SITE = "Clash With JPA";
    const ACCENT = "#E68E2E";

    const origin = $derived(page.url.origin);
    const canonical = $derived(`${origin}${page.url.pathname === "/" ? "/" : page.url.pathname.replace(/\/$/, "")}`);
    const fullTitle = $derived(title ? `${title} | ${SITE}` : `${SITE} | FWA Clans`);
    const absoluteImage = $derived(image.startsWith("http") ? image : `${origin}${image}`);
    // Dashboard, admin and the sign-in popup render client-side only, and error pages aren't real pages: none belong in search.
    const hidden = $derived(noindex || page.status >= 400 || !!page.route.id?.startsWith("/(auth)") || !!page.route.id?.startsWith("/auth"));

    let cardButtons = $derived.by((): LinkButton[] => {
        const all = [...buttons];
        if (extraButtons) {
            all.push({ label: "Apply", url: `${origin}/dashboard/apply`, emoji: "📝" });
            if (LINKS.discord) all.push({ label: "Discord", url: LINKS.discord, emoji: "💬" });
        }
        const unique = all.filter((b, i) => all.findIndex((o) => o.url === b.url) === i);
        // An action row holds at most five buttons.
        return unique.slice(0, 5).map((b) => linkButton(b.label, b.url, b.emoji));
    });

    // Discord's Components v2 link card: key art banner, the linked title, the description and buttons. No separators.
    let card = $derived.by((): Container =>
        container(
            [
                mediaGallery([{ media: { url: absoluteImage }, description: imageAlt }]),
                textDisplay(`## [${title || SITE}](${canonical})\n${description}`),
                ...(cardButtons.length ? [actionRow(cardButtons)] : []),
            ],
            hexToAccentColor(ACCENT),
        ),
    );

    let componentEmbedJson = $derived(serializeComponentEmbed({ component: embed ?? card } satisfies ComponentEmbedPayload));

    let jsonLd = $derived(
        JSON.stringify({
            "@context": "https://schema.org",
            "@graph": [
                {
                    "@type": "Organization",
                    "@id": `${origin}/#organization`,
                    name: SITE,
                    alternateName: "JPA",
                    url: `${origin}/`,
                    logo: `${origin}/logo.webp`,
                    ...(LINKS.discord ? { sameAs: [LINKS.discord] } : {}),
                },
                {
                    "@type": "WebSite",
                    "@id": `${origin}/#website`,
                    url: `${origin}/`,
                    name: SITE,
                    inLanguage: "en",
                    publisher: { "@id": `${origin}/#organization` },
                },
                {
                    "@type": "WebPage",
                    "@id": `${canonical}#webpage`,
                    url: canonical,
                    name: fullTitle,
                    description,
                    inLanguage: "en",
                    isPartOf: { "@id": `${origin}/#website` },
                    primaryImageOfPage: { "@type": "ImageObject", url: absoluteImage },
                    ...(title
                        ? {
                              breadcrumb: {
                                  "@type": "BreadcrumbList",
                                  itemListElement: [
                                      { "@type": "ListItem", position: 1, name: "Home", item: `${origin}/` },
                                      { "@type": "ListItem", position: 2, name: title, item: canonical },
                                  ],
                              },
                          }
                        : {}),
                },
            ],
        }).replace(/</g, "\\u003c"),
    );
</script>

<svelte:head>
    <title>{fullTitle}</title>
    <meta name="description" content={description} />
    <meta name="robots" content={hidden ? "noindex, nofollow" : "index, follow, max-image-preview:large"} />
    {#if !hidden}
        <link rel="canonical" href={canonical} />
    {/if}
    <link rel="icon" type="image/webp" href="/logo.webp" />
    <link rel="apple-touch-icon" href="/logo.webp" />
    <meta name="theme-color" content="#3a2314" />
    <meta name="author" content="JPA" />

    <meta property="og:type" content="website" />
    <meta property="og:site_name" content={SITE} />
    <meta property="og:locale" content="en_US" />
    <meta property="og:url" content={canonical} />
    <meta property="og:title" content={title || SITE} />
    <meta property="og:description" content={description} />
    <meta property="og:image" content={absoluteImage} />
    {#if image === "/og.jpg"}
        <meta property="og:image:type" content="image/jpeg" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
    {/if}
    <meta property="og:image:alt" content={imageAlt} />

    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content={title || SITE} />
    <meta name="twitter:description" content={description} />
    <meta name="twitter:image" content={absoluteImage} />
    <meta name="twitter:image:alt" content={imageAlt} />

    {#if !hidden}
        <!-- eslint-disable-next-line svelte/no-at-html-tags -- built from our own strings, with < escaped -->
        {@html `<script type="application/ld+json">${jsonLd}<` + "/script>"}
    {/if}
    <!-- eslint-disable-next-line svelte/no-at-html-tags -- componentEmbedJson is server-generated JSON, not user input -->
    {@html `<script id="discord:component-embed" type="application/json">${componentEmbedJson}<` + "/script>"}
</svelte:head>
