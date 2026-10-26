<script lang="ts">
    import { authClient } from "#lib/auth.js";
    import SessionCard from "#lib/components/SessionCard.svelte";
    import CardSkeleton from "#lib/components/ui/CardSkeleton.svelte";
    import Seo from "#lib/components/ui/Seo.svelte";
    import TablerServer from "~icons/tabler/server";

    let session = authClient.useSession();
    let sessions = authClient.listSessions();

    async function invalidateSession(token: string) {
        await authClient.revokeSession({ token });
        sessions = authClient.listSessions();
    }
</script>

<Seo title="Settings" />

{#snippet heading()}
    <div class="flex flex-col gap-1">
        <h1 class="text-4xl font-bold">Active Sessions</h1>
        <p class="text-sm text-stone-400">Manage your active sessions across all devices.</p>
    </div>
    <br />
{/snippet}

{#await sessions}
    <div aria-busy="true">
        {@render heading()}
        <div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {#each { length: 3 }, i (i)}
                <CardSkeleton variant="session" />
            {/each}
        </div>
    </div>
{:then resp}
    <div>
        {@render heading()}
        {#if !resp.data || resp.data.length === 0}
            <div class="flex items-center justify-start gap-1 text-stone-400">
                <TablerServer />
                <span>No active sessions found</span>
            </div>
        {:else}
            <div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {#each resp.data as s, i (s.id)}
                    <div class="stagger-card" style="--i:{i}">
                        <SessionCard sessionData={s} currentSessionId={$session.data?.session?.id} onRevoke={invalidateSession} />
                    </div>
                {/each}
            </div>
        {/if}
    </div>
{/await}
