import { carta } from "$lib/carta";

export interface MarkdownSection {
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

function parseSections(html: string): { intro: string; sections: MarkdownSection[] } {
    // Split into cards on horizontal rules (rendered from `---`).
    const chunks = html.split(/<hr\b[^>]*\/?>/i);

    const sections: MarkdownSection[] = [];
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

const EMAIL_PATTERN = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;

// Shared parse contract between the admin editor and the public pages: split on
// `---`, first heading is the card title, its slug is the anchor id. Every page
// built on `ReadmeEditor` content must go through this so anchors never diverge.
export async function renderSections(markdown: string): Promise<{ intro: string; sections: MarkdownSection[] }> {
    const html = await carta.render(markdown);

    const processedHtml = html.replace(/<a\s+href=["']([^"']+)["']([^>]*)>/g, (match, href, attrs) => {
        // A bare email destination (e.g. from a `[label]: you@site.com` reference) becomes a mailto: link.
        if (EMAIL_PATTERN.test(href)) {
            return `<a href="mailto:${href}"${attrs}>`;
        }
        const isExternal = /^https?:\/\//.test(href);
        if (isExternal && !attrs.includes("target=")) {
            return `<a href="${href}"${attrs} target="_blank" rel="noopener noreferrer">`;
        }
        return match;
    });

    return parseSections(processedHtml);
}

// Reads a link reference definition (`[label]: value`) out of markdown source.
// These render invisibly, so the same value can be reused both inline via
// `[text][label]` and outside the markdown, e.g. a sidebar contact button.
export function extractMarkdownVar(markdown: string, label: string): string | null {
    const match = markdown.match(new RegExp(`^\\[${label}\\]:\\s*(\\S+)`, "im"));
    return match?.[1] ?? null;
}
