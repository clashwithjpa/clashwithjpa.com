<script lang="ts">
    import { PUBLIC_SERVER_URL } from "$env/static/public";
    import { authClient, hasPermission } from "$lib/auth";
    import Button from "$lib/components/ui/Button.svelte";
    import Seo from "$lib/components/ui/Seo.svelte";
    import { cardSlideIn, fadeIn } from "$lib/utils/animations";
    import { getCwlApplications, getJoinApplications } from "@repo/clashofclans-client";
    import { onMount, type Component } from "svelte";
    import SvgSpinnersBlocksScale from "~icons/svg-spinners/blocks-scale";
    import TablerBook2 from "~icons/tabler/book-2";
    import TablerFileDescription from "~icons/tabler/file-description";
    import TablerHistory from "~icons/tabler/history";
    import TablerSettings from "~icons/tabler/settings";
    import TablerSwords from "~icons/tabler/swords";
    import TablerUser from "~icons/tabler/user";

    const session = authClient.useSession();

    type SummaryCard = {
        href: string;
        title: string;
        description: string;
        icon: Component;
        requiredPerm: "review" | "manage" | "sudo";
    };

    const cards: SummaryCard[] = [
        {
            href: "/admin/join-applications",
            title: "Join Applications",
            description: "Review pending clan join applications",
            icon: TablerFileDescription,
            requiredPerm: "review",
        },
        {
            href: "/admin/cwl-applications",
            title: "CWL Applications",
            description: "Manage CWL applications and assignments",
            icon: TablerSwords,
            requiredPerm: "manage",
        },
        { href: "/admin/users", title: "Users", description: "Manage users, roles and sessions", icon: TablerUser, requiredPerm: "manage" },
        { href: "/admin/rules", title: "Rules", description: "Edit alliance rules", icon: TablerBook2, requiredPerm: "manage" },
        { href: "/admin/audit-log", title: "Audit Log", description: "View server actions history", icon: TablerHistory, requiredPerm: "manage" },
        {
            href: "/admin/settings",
            title: "Settings",
            description: "Site-wide toggles and configuration",
            icon: TablerSettings,
            requiredPerm: "sudo",
        },
    ];

    let pendingJoin = $state<number | null>(null);
    let unassignedCwl = $state<number | null>(null);

    onMount(async () => {
        const canReview = await hasPermission($session.data?.user?.id, "review");
        if (!canReview) return;

        const now = new Date();
        const [joinResp, cwlResp] = await Promise.allSettled([
            getJoinApplications({ status: "pending", limit: 1 }, { baseURL: PUBLIC_SERVER_URL, credentials: "include" }),
            getCwlApplications(
                {
                    month: now.toLocaleString("en-US", { month: "long" }),
                    year: now.getFullYear(),
                    unassigned: true,
                    limit: 1,
                },
                { baseURL: PUBLIC_SERVER_URL, credentials: "include" },
            ),
        ]);

        if (joinResp.status === "fulfilled" && joinResp.value.success) pendingJoin = joinResp.value.data.total;
        if (cwlResp.status === "fulfilled" && cwlResp.value.success) unassignedCwl = cwlResp.value.data.total;
    });
</script>

<Seo title="Admin Panel" description="Admin control panel" />

<div in:fadeIn class="flex size-full flex-col gap-8 overflow-y-auto p-2">
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
            {#each cards as card (card.href)}
                {#await hasPermission($session.data?.user?.id, card.requiredPerm) then allowed}
                    <Button
                        variant="ghost"
                        href={allowed ? card.href : undefined}
                        disabled={!allowed}
                        class="flex items-start justify-start gap-3 p-4 text-left"
                    >
                        <card.icon class="size-8 shrink-0 text-stone-300" />
                        <div class="flex flex-col items-start gap-0.5">
                            <span class="font-semibold text-stone-50">{card.title}</span>
                            <span class="text-xs text-stone-400">{card.description}</span>
                        </div>
                    </Button>
                {/await}
            {/each}
        </div>
    </div>
</div>
