<script lang="ts">
    import ReadmeEditor from "#lib/components/ui/ReadmeEditor.svelte";
    import Seo from "#lib/components/ui/Seo.svelte";
    import { toast } from "#lib/toast.js";
    import { errorMessage } from "#lib/utils.js";
    import { createMobileMediaQuery } from "#lib/utils/mobile.js";
    import { setRules } from "@repo/clashofclans-client";
    import { onMount } from "svelte";
    import type { PageData } from "./$types";

    let { data }: { data: PageData } = $props();

    let rulesContent = $derived(data.rules.data.rules || "");
    let isMobile = $state(false);

    onMount(() => {
        return createMobileMediaQuery((m) => {
            isMobile = m;
        }, "lg");
    });

    async function handleSave() {
        try {
            const saved = await setRules({ body: { rules: rulesContent } }).unwrap();
            rulesContent = saved.data.rules;
            toast.success("Rules updated successfully");
        } catch (e) {
            toast.error("Failed to update rules", { description: errorMessage(e) || "An error occurred" });
        }
    }
</script>

<Seo title="Admin Rules" description="Edit the rules for your server" />

<div class="size-full overflow-hidden">
    <ReadmeEditor bind:value={rulesContent} {isMobile} onSave={handleSave} />
</div>
