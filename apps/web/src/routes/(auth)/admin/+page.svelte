<script lang="ts">
    import { PUBLIC_SERVER_URL } from "$env/static/public";
    import { authClient } from "$lib/auth";
    import Button from "$lib/components/ui/Button.svelte";
    import Seo from "$lib/components/ui/Seo.svelte";
    import { cardSlideIn, fadeIn } from "$lib/utils/animations";
    import { getCwlApplications, getJoinApplications } from "@repo/clashofclans-client";
    import { onMount } from "svelte";
    import SvgSpinnersBlocksScale from "~icons/svg-spinners/blocks-scale";
    import TablerFileDescription from "~icons/tabler/file-description";
    import TablerSwords from "~icons/tabler/swords";
    import type { PageProps } from "./$types";

    let { data }: PageProps = $props();
    const session = authClient.useSession();

    let adminCards = $derived(data.adminLinks.filter((link) => link.description));

    let pendingJoin = $state<number | null>(null);
    let unassignedCwl = $state<number | null>(null);

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
        <div use:cardSlideIn class="flex items-center justify-between gap-4 rounded-lg border-2 border-stone-700/50 bg-stone-900 p-4">
            <div>
                <p class="text-xs font-medium text-stone-400">Pending join applications</p>
                {#if pendingJoin === null}
                    <SvgSpinnersBlocksScale class="size-6 text-stone-400" />
                {:else}
                    <p class="text-3xl font-bold text-stone-50">{pendingJoin}</p>
                {/if}
            </div>
            <TablerFileDescription class="size-10 text-stone-500" />
        </div>
        <div use:cardSlideIn class="flex items-center justify-between gap-4 rounded-lg border-2 border-stone-700/50 bg-stone-900 p-4">
            <div>
                <p class="text-xs font-medium text-stone-400">Unassigned CWL applications</p>
                {#if unassignedCwl === null}
                    <SvgSpinnersBlocksScale class="size-6 text-stone-400" />
                {:else}
                    <p class="text-3xl font-bold text-stone-50">{unassignedCwl}</p>
                {/if}
            </div>
            <TablerSwords class="size-10 text-stone-500" />
        </div>
    </div>

    <div class="flex flex-col gap-3">
        <h2 class="text-xl font-bold">Sections</h2>
        <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {#each adminCards as card (card.href)}
                {@const allowed = !card.requiredPerm || !!data.permissions?.[card.requiredPerm]}
                {#if allowed}
                    <Button variant="ghost" href={card.href} class="flex items-start justify-start gap-3 p-4 text-left">
                        <card.icon class="size-8 shrink-0 text-stone-300" />
                        <div class="flex flex-col items-start gap-0.5">
                            <span class="font-semibold text-stone-50">{card.name}</span>
                            <span class="text-xs text-stone-400">{card.description}</span>
                        </div>
                    </Button>
                {/if}
            {/each}
        </div>
    </div>
</div>
