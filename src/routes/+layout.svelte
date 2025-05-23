<script lang="ts">
    import { afterNavigate, beforeNavigate, onNavigate } from "$app/navigation";
    import type { UserData } from "$lib/auth/user";
    import Navbar from "$lib/components/Navbar.svelte";
    import { subscribeToast } from "$lib/components/toast";
    import NProgress from "nprogress";
    import type { Snippet } from "svelte";
    import { Toaster } from "svelte-sonner";
    import { expoOut } from "svelte/easing";
    import { fly } from "svelte/transition";
    import "../app.css";
    import "../nprogress.css";
    import type { PageData } from "./$types";

    interface Props {
        data: PageData;
        children?: Snippet;
    }

    let { data, children }: Props = $props();

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

    let show: boolean = $state(false);
    subscribeToast((data: boolean) => {
        show = data;
    });
</script>

<Toaster
    richColors
    position="bottom-left"
    toastOptions={{
        classes: {
            toast: "mb-[100px] ml-[130px] w-[40vw]! lg:w-full! shadow-[0_0_0_3px_#F3F4F6,0_1px_0_6px_#030712,0_6px_0_6px_#0006] rounded-md",
            title: "font-coc text-sm",
            description: "font-coc text-[0.65rem] brightness-75"
        }
    }}
></Toaster>

{#if show}
    <img
        transition:fly={{ duration: 500, easing: expoOut, x: 0, y: 100 }}
        src="/villager.webp"
        alt="Villager"
        class="fixed -bottom-24 left-0 z-1000 h-80 lg:h-96"
    />
{/if}

<main class="h-screen w-screen">
    <Navbar user={data.user as UserData} applicationEnabled={data.applicationEnabled} cwlEnabled={data.cwlEnabled} cocAccs={data.cocAccs} />
    {@render children?.()}
</main>
