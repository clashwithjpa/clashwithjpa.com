import { renderSections } from "#lib/utils/markdown-sections.js";
import { getRules } from "@repo/clashofclans-client";
import type { PageLoad } from "./$types";

export const load: PageLoad = async () => {
    try {
        const rules = await getRules({}).unwrap();
        const { intro, sections } = await renderSections(rules.data.rules || "# Enjoy! There are no rules.");
        return { intro, sections };
    } catch {
        return { intro: "", sections: [] };
    }
};
