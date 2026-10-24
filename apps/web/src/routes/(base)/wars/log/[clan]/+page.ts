import { slugToTag } from "$lib/components/coc/war-log/warLog";
import type { PageLoad } from "./$types";

// Any clan tag can follow /wars/log, so this page can't be prerendered. The SPA fallback serves it.
export const prerender = false;
export const ssr = false;

export const load: PageLoad = ({ params }) => ({ tag: slugToTag(params.clan) });
