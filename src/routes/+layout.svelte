<script lang="ts">
    import { afterNavigate, beforeNavigate, onNavigate } from "$app/navigation";
    import NProgress from "nprogress";
    import type { Snippet } from "svelte";
    import "../app.css";

    let { children }: { children: Snippet } = $props();

    onNavigate((navigation) => {
        if (!document.startViewTransition) return;

        return new Promise((resolve) => {
            document.startViewTransition(async () => {
                resolve();
                await navigation.complete;
            });
        });
    });

    NProgress.configure({ showSpinner: false });
    beforeNavigate(() => {
        NProgress.start();
    });
    afterNavigate(() => {
        NProgress.done();
    });
</script>

<main class="h-screen w-screen">
    {@render children()}
</main>
