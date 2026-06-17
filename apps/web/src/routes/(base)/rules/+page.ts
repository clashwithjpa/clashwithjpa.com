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
    // Split into cards on horizontal rules (rendered from `---`).
    const chunks = html.split(/<hr\b[^>]*\/?>/i);

    const sections: RuleSection[] = [];
    const introParts: string[] = [];

    chunks.forEach((chunk) => {
        const trimmed = chunk.trim();
        if (!trimmed) return;

        // The first heading of any level (#, ##, ###, …) becomes the card title.
        const headingMatch = trimmed.match(/<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1>/i);
        if (!headingMatch) {
            introParts.push(trimmed);
            return;
        }

        const title = stripTags(headingMatch[2]);
        const id = slugify(title) || `section-${sections.length + 1}`;

        // Drop the title heading from the body; the page renders it separately.
        const body = (trimmed.slice(0, headingMatch.index) + trimmed.slice((headingMatch.index ?? 0) + headingMatch[0].length)).trim();
        sections.push({ id, title, html: body });
    });

    const intro = introParts.join("\n").trim();
    return { intro: stripTags(intro) ? intro : "", sections };
}

export const load: PageLoad = async () => {
    try {
        const rules = await getRules({ baseURL: PUBLIC_SERVER_URL });
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
    } catch {
        return { intro: "", sections: [] };
    }
};
