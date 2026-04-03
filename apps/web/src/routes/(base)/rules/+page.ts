import { PUBLIC_SERVER_URL } from "$env/static/public";
import { carta } from "$lib/carta";
import { getRules } from "@repo/clashofclans-client";
import type { PageLoad } from "./$types";

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

    return { rules: processedHtml };
};
