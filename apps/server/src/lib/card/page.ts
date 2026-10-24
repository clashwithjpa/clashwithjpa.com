import type { ContainerBuilder } from "discord.js";

// Matches the web app's Seo.svelte, so a /meta card and a prerendered page describe the site alike.
const SITE = "Clash With JPA";
const THEME_COLOR = "#3a2314";

/** What a card builder hands to `metaPageHtml`. Every /meta route returns one of these. */
export type MetaCard = {
    /** The page's own title; the site name is added for the document title. */
    title: string;
    description: string;
    /** The real page this card stands for, i.e. the shared link. */
    url: string;
    image?: string | null;
    imageAlt?: string;
    /** `large` asks apps for a full-width banner instead of a thumbnail. */
    imageSize?: "small" | "large";
    /** Discord's Components v2 card; apps without it fall back to the OG tags. */
    component: ReturnType<ContainerBuilder["toJSON"]>;
};

const escapeHtml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** A bare page for link-preview crawlers: OG and Twitter tags for most apps, the component embed for Discord. */
export function metaPageHtml(card: MetaCard): string {
    const title = escapeHtml(card.title);
    const fullTitle = escapeHtml(`${card.title} | ${SITE}`);
    const description = escapeHtml(card.description);
    const url = escapeHtml(card.url);
    const image = card.image ? escapeHtml(card.image) : null;
    const imageAlt = card.imageAlt ? escapeHtml(card.imageAlt) : null;
    // `<` is escaped so a value can't close the script tag early.
    const embed = JSON.stringify({ component: card.component }).replace(/</g, "\\u003c");

    const tags = [
        `<meta charset="utf-8" />`,
        `<title>${fullTitle}</title>`,
        `<meta name="description" content="${description}" />`,
        `<link rel="canonical" href="${url}" />`,
        `<meta name="theme-color" content="${THEME_COLOR}" />`,
        `<meta property="og:type" content="website" />`,
        `<meta property="og:site_name" content="${SITE}" />`,
        `<meta property="og:url" content="${url}" />`,
        `<meta property="og:title" content="${title}" />`,
        `<meta property="og:description" content="${description}" />`,
        image && `<meta property="og:image" content="${image}" />`,
        image && imageAlt && `<meta property="og:image:alt" content="${imageAlt}" />`,
        `<meta name="twitter:card" content="${card.imageSize === "large" ? "summary_large_image" : "summary"}" />`,
        `<meta name="twitter:title" content="${title}" />`,
        `<meta name="twitter:description" content="${description}" />`,
        image && `<meta name="twitter:image" content="${image}" />`,
        `<script id="discord:component-embed" type="application/json">${embed}</script>`,
    ].filter(Boolean);

    return `<!doctype html>\n<html lang="en">\n<head>\n${tags.join("\n")}\n</head>\n<body><a href="${url}">${fullTitle}</a></body>\n</html>`;
}
