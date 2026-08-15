import { PUBLIC_SERVER_URL } from "$env/static/public";
import { extractMarkdownVar, renderSections } from "$lib/utils/markdown-sections";
import { getPrivacy } from "@repo/clashofclans-client";
import type { PageLoad } from "./$types";

// No try/catch here, unlike the rules loader: this page is prerendered, so
// swallowing a fetch failure would silently ship a blank privacy policy. Let
// it throw and fail the build instead.
export const load: PageLoad = async () => {
    const privacy = await getPrivacy({ baseURL: PUBLIC_SERVER_URL });
    const markdown = privacy.data.privacy || "";

    const { sections } = await renderSections(markdown);
    const email = extractMarkdownVar(markdown, "email");

    return { sections, email };
};
