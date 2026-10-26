<script lang="ts">
    import { AUTH_POPUP_CHANNEL, type AuthPopupMessage } from "#lib/auth.js";
    import CocBtn from "#lib/components/ui/coc/CocBtn.svelte";
    import CocCard from "#lib/components/ui/coc/CocCard.svelte";
    import { page } from "$app/state";
    import { onMount } from "svelte";

    // Discord lands here in the sign-in popup. Tell the tab that opened it, then close.
    const error = page.url.searchParams.get("error");
    let stillOpen = $state(false);

    onMount(() => {
        const message: AuthPopupMessage = error ? { type: "error", error } : { type: "signed-in" };
        const channel = new BroadcastChannel(AUTH_POPUP_CHANNEL);
        channel.postMessage(message);
        channel.close();

        // Browsers only let a script close windows a script opened. If this page was
        // reached any other way it stays open, so it shows where to go instead.
        if (!error) window.close();
        const timer = setTimeout(() => (stillOpen = true), 300);
        return () => clearTimeout(timer);
    });
</script>

<svelte:head>
    <title>JPA | Signing in</title>
    <meta name="robots" content="noindex" />
</svelte:head>

<main class="grid min-h-dvh place-items-center bg-stone-950 p-4 font-coc">
    {#if error || stillOpen}
        <CocCard variant="panel" class="w-full max-w-sm" contentClass="flex flex-col items-center gap-3 p-6 text-center">
            <h1 class="text-2xl font-black text-white text-outline">{error ? "Sign-in didn't go through" : "You're signed in"}</h1>
            <p class="text-sm text-parchment/80">
                {error ? "Discord didn't finish signing you in. Close this window and try again." : "You can close this window and head back."}
            </p>
            {#if error}
                <p class="rounded-lg px-3 py-1.5 font-mono text-xs break-all text-parchment/60 coc-slot">{error}</p>
            {/if}
            <div class="flex gap-2">
                <CocBtn variant="orange" size="sm" onclick={() => window.close()}>Close</CocBtn>
                <CocBtn variant="green" size="sm" href="/">Back to JPA</CocBtn>
            </div>
        </CocCard>
    {/if}
</main>
