<script lang="ts">
    import { PUBLIC_SERVER_URL } from "$env/static/public";
    import ReadmeEditor from "$lib/components/ui/ReadmeEditor.svelte";
    import Seo from "$lib/components/ui/Seo.svelte";
    import { fadeIn } from "$lib/utils/animations";
    import { createMobileMediaQuery } from "$lib/utils/mobile";
    import { setRules } from "@repo/clashofclans-client";
    import { onMount } from "svelte";
    import { toast } from "svelte-sonner";
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
            const newRulesResp = await setRules(
                { rules: rulesContent },
                { baseURL: PUBLIC_SERVER_URL, credentials: "include", headers: { "Content-Type": "application/json" } },
            );
            rulesContent = newRulesResp.data.rules;
            toast.success("Rules updated successfully");
        } catch (e: any) {
            toast.error("Failed to update rules", { description: e.message || "An error occurred" });
        }
    }
</script>

<Seo title="Admin Rules" description="Edit the rules for your server" />

<div in:fadeIn class="size-full overflow-hidden">
    <ReadmeEditor bind:value={rulesContent} {isMobile} onSave={handleSave} />
</div>
