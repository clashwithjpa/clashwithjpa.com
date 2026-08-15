<script lang="ts">
    import { PUBLIC_SERVER_URL } from "$env/static/public";
    import ReadmeEditor from "$lib/components/ui/ReadmeEditor.svelte";
    import Seo from "$lib/components/ui/Seo.svelte";
    import { errorMessage } from "$lib/utils";
    import { createMobileMediaQuery } from "$lib/utils/mobile";
    import { setPrivacy } from "@repo/clashofclans-client";
    import { onMount } from "svelte";
    import { toast } from "svelte-sonner";
    import type { PageData } from "./$types";

    let { data }: { data: PageData } = $props();

    let privacyContent = $derived(data.privacy.data.privacy || "");
    let isMobile = $state(false);

    onMount(() => {
        return createMobileMediaQuery((m) => {
            isMobile = m;
        }, "lg");
    });

    async function handleSave() {
        try {
            const newPrivacyResp = await setPrivacy(
                { privacy: privacyContent },
                { baseURL: PUBLIC_SERVER_URL, credentials: "include", headers: { "Content-Type": "application/json" } },
            );
            privacyContent = newPrivacyResp.data.privacy;
            toast.success("Privacy policy updated successfully");
        } catch (e) {
            toast.error("Failed to update privacy policy", { description: errorMessage(e) || "An error occurred" });
        }
    }
</script>

<Seo title="Admin Privacy Policy" description="Edit the site privacy policy" />

<div class="size-full overflow-hidden">
    <ReadmeEditor bind:value={privacyContent} {isMobile} onSave={handleSave} />
</div>
