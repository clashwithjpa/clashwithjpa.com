import { watchEggs } from "./eggs.svelte";
import { watchImpersonation } from "./impersonation.svelte";

// Background watchers that push activities on their own. Each runs once during
// the island's setup, so it may use $effect. Add new ones here.
export const SOURCES = [watchImpersonation, watchEggs];
