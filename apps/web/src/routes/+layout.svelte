<script lang="ts">
    import { clearIdentifiedUser, identifyUser } from "#lib/analytics.js";
    import { authClient } from "#lib/auth.js";
    import Island from "#lib/components/island/Island.svelte";
    import Snowfall from "#lib/components/Snowfall.svelte";
    import { beforeNavigate } from "$app/navigation";
    import { updated } from "$app/state";
    import "@cartamd/plugin-anchor/default.css";
    import "@cartamd/plugin-code/default.css";
    import "@cartamd/plugin-emoji/default.css";
    import "@fontsource-variable/jetbrains-mono";
    import "@fontsource-variable/jetbrains-mono/wght-italic.css";
    import "@fontsource-variable/rubik";
    import "@fontsource-variable/rubik/wght-italic.css";
    import "carta-md/default.css";
    import { onMount } from "svelte";
    import "./layout.css";

    let { children } = $props();

    const session = authClient.useSession();

    // A deploy swaps out the old build's chunks, so once SvelteKit spots a newer version,
    // the next in-app navigation loads the page fresh instead of from the stale manifest.
    beforeNavigate(({ willUnload, shallow, to }) => {
        if (updated.current && !willUnload && !shallow && to?.url) location.href = to.url.href;
    });

    $effect(() => {
        const user = $session.data?.user;
        if (user) {
            identifyUser(user);
        } else if (!$session.isPending) {
            clearIdentifiedUser();
        }
    });

    onMount(() => {
        const el = document.getElementById("ls");
        if (el) {
            el.classList.add("out");
            setTimeout(() => el.remove(), 850);
        }
    });
</script>

<div class="h-dvh w-full">
    {@render children()}
</div>

<Island />

<Snowfall />
