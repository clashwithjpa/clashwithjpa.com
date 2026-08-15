import { PUBLIC_SERVER_URL } from "$env/static/public";
import { renderSections } from "$lib/utils/markdown-sections";
import { getRules } from "@repo/clashofclans-client";
import type { PageLoad } from "./$types";

export const load: PageLoad = async () => {
    const rules = await getRules({ baseURL: PUBLIC_SERVER_URL });
    const { intro, sections } = await renderSections((rules.data.rules || "# Enjoy! There are no rules.") as string);
    return { intro, sections };
};
