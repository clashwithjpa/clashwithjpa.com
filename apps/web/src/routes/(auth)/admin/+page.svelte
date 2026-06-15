<script lang="ts">
    import { PUBLIC_SERVER_URL } from "$env/static/public";
    import { authClient } from "$lib/auth";
    import AdminAnalytics from "$lib/components/AdminAnalytics.svelte";
    import Seo from "$lib/components/ui/Seo.svelte";
    import { bounceDown, bounceUp, cardSlideIn, fadeIn } from "$lib/utils/animations";
    import { getCwlApplications, getJoinApplications } from "@repo/clashofclans-client";
    import { onMount } from "svelte";
    import SvgSpinnersBlocksScale from "~icons/svg-spinners/blocks-scale";
    import TablerFileDescription from "~icons/tabler/file-description";
    import TablerSwords from "~icons/tabler/swords";
    import type { PageProps } from "./$types";

    let { data }: PageProps = $props();
    const session = authClient.useSession();

    let pendingJoin = $state<number | null>(null);
    let unassignedCwl = $state<number | null>(null);

    let isPressed = false;
    function handlePointerDown(e: Event) {
        isPressed = true;
        bounceDown(e.currentTarget as Element);
    }
    function handlePointerUp(e: Event) {
        if (!isPressed) return;
        isPressed = false;
        bounceUp(e.currentTarget as Element);
    }

    onMount(async () => {
        if (!data.permissions?.review) return;

        const [joinResp, cwlResp] = await Promise.allSettled([
            getJoinApplications({ status: "pending", limit: 1 }, { baseURL: PUBLIC_SERVER_URL, credentials: "include" }),
            getCwlApplications({ unassigned: true, limit: 1 }, { baseURL: PUBLIC_SERVER_URL, credentials: "include" }),
        ]);

        if (joinResp.status === "fulfilled" && joinResp.value.success) pendingJoin = joinResp.value.data.total;
        if (cwlResp.status === "fulfilled" && cwlResp.value.success) unassignedCwl = cwlResp.value.data.total;
    });
</script>

<Seo title="Admin Panel" description="Admin control panel" />

<div in:fadeIn class="flex size-full flex-col gap-8">
    <div>
        <h1 class="text-3xl font-bold">Admin Panel</h1>
        <p class="text-sm text-stone-400">
            Welcome back, <span class="text-stone-200">{$session.data?.user?.name?.split(" ")[0] ?? ""}</span>.
        </p>
    </div>

    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <a
            use:cardSlideIn
            href="/admin/join-applications"
            onpointerdown={handlePointerDown}
            onpointerup={handlePointerUp}
            onpointerleave={handlePointerUp}
            class="flex cursor-pointer items-center justify-between gap-4 rounded-lg border-2 border-stone-700/50 bg-stone-900 p-4 transition-colors duration-200 outline-none hover:border-stone-600 hover:bg-stone-800"
        >
            <div>
                <p class="text-xs font-medium text-stone-400">Pending join applications</p>
                {#if pendingJoin === null}
                    <SvgSpinnersBlocksScale class="size-6 text-stone-400" />
                {:else}
                    <p class="text-3xl font-bold text-stone-50">{pendingJoin}</p>
                {/if}
            </div>
            <TablerFileDescription class="size-10 text-stone-400" />
        </a>
        <a
            use:cardSlideIn
            href="/admin/cwl-applications"
            onpointerdown={handlePointerDown}
            onpointerup={handlePointerUp}
            onpointerleave={handlePointerUp}
            class="group flex cursor-pointer items-center justify-between gap-4 rounded-lg border-2 border-stone-700/50 bg-stone-900 p-4 transition-colors duration-200 outline-none hover:border-stone-600 hover:bg-stone-800"
        >
            <div>
                <p class="text-xs font-medium text-stone-400">Unassigned CWL applications</p>
                {#if unassignedCwl === null}
                    <SvgSpinnersBlocksScale class="size-6 text-stone-400" />
                {:else}
                    <p class="text-3xl font-bold text-stone-50">{unassignedCwl}</p>
                {/if}
            </div>
            <TablerSwords class="size-10 text-stone-400" />
        </a>
    </div>

    <AdminAnalytics />
</div>
