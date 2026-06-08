import { PUBLIC_SERVER_URL } from "$env/static/public";
import { carta } from "$lib/carta";
import { getRules } from "@repo/clashofclans-client";
import type { PageLoad } from "./$types";

export interface RuleSection {
    id: string;
    title: string;
    html: string;
}

function stripTags(html: string): string {
    return html
        .replace(/<[^>]+>/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/\s+/g, " ")
        .trim();
}

function slugify(text: string): string {
    return text
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
}
function parseRules(html: string): { intro: string; sections: RuleSection[] } {
    // Drop the leading top-level title (the page renders its own heading).
    const h1Match = html.match(/<h1\b[^>]*>[\s\S]*?<\/h1>/i);
    if (h1Match?.index !== undefined) {
        html = html.slice(0, h1Match.index) + html.slice(h1Match.index + h1Match[0].length);
    }

    const headings = [...html.matchAll(/<h2\b([^>]*)>([\s\S]*?)<\/h2>/gi)];

    const intro = headings.length ? html.slice(0, headings[0].index).trim() : html.trim();

    const sections: RuleSection[] = headings.map((match, i) => {
        const attrs = match[1];
        const title = stripTags(match[2]);
        const id = attrs.match(/id="([^"]*)"/i)?.[1] || slugify(title) || `section-${i + 1}`;
        const start = (match.index ?? 0) + match[0].length;
        const end = i + 1 < headings.length ? (headings[i + 1].index ?? html.length) : html.length;
        const body = html.slice(start, end).trim();
        return { id, title, html: body };
    });

    return { intro: stripTags(intro) ? intro : "", sections };
}

export const load: PageLoad = async () => {
    const rules = await getRules({
        baseURL: PUBLIC_SERVER_URL,
    });
    const htmlRules = await carta.render((rules.data.rules || "# Enjoy! There are no rules.") as string);

    const processedHtml = htmlRules.replace(/<a\s+href=["']([^"']+)["']([^>]*)>/g, (match, href, attrs) => {
        const isExternal = /^https?:\/\//.test(href);
        if (isExternal && !attrs.includes("target=")) {
            return `<a href="${href}"${attrs} target="_blank" rel="noopener noreferrer">`;
        }
        return match;
    });

    const { intro, sections } = parseRules(processedHtml);

    return { intro, sections };
};
