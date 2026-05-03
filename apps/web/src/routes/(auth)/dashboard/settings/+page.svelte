<script lang="ts">
    import { authClient } from "$lib/auth";
    import Seo from "$lib/components/ui/Seo.svelte";
    import { fadeIn } from "$lib/utils/animations";
    import SvgSpinnersBlocksScale from "~icons/svg-spinners/blocks-scale";
    import TablerServer from "~icons/tabler/server";
    // Browser Icons
    import SessionCard from "$lib/components/SessionCard.svelte";

    let session = authClient.useSession();
    let sessions = authClient.listSessions();

    async function invalidateSession(token: string) {
        await authClient.revokeSession({ token });
        sessions = authClient.listSessions();
    }
</script>

<Seo title="Settings" />

{#await sessions}
    <div in:fadeIn class="flex items-center justify-start gap-2 text-2xl font-bold text-stone-400">
        <SvgSpinnersBlocksScale />
        <span>Active Sessions</span>
    </div>
{:then resp}
    <div in:fadeIn>
        <div class="flex flex-col gap-1">
            <h1 class="text-4xl font-bold">Active Sessions</h1>
            <p class="text-sm text-stone-400">Manage your active sessions across all devices.</p>
        </div>
        <br />
        {#if !resp.data || resp.data.length === 0}
            <div class="flex items-center justify-start gap-1 text-stone-400">
                <TablerServer />
                <span>No active sessions found</span>
            </div>
        {:else}
            <div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {#each resp.data as s (s.id)}
                    <SessionCard sessionData={s} currentSessionId={$session.data?.session?.id} onRevoke={invalidateSession} />
                {/each}
            </div>
        {/if}
    </div>
{/await}
