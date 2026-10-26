import { extractMarkdownVar, renderSections } from "#lib/utils/markdown-sections.js";
import { getPrivacy } from "@repo/clashofclans-client";
import type { PageLoad } from "./$types";

export const load: PageLoad = async () => {
    try {
        const privacy = await getPrivacy({}).unwrap();
        const markdown = privacy.data.privacy || "";

        const { sections } = await renderSections(markdown);
        const email = extractMarkdownVar(markdown, "email");

        return { sections, email };
    } catch {
        return { sections: [], email: null };
    }
};
