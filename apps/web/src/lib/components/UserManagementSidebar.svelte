<script lang="ts">
    import { authClient } from "$lib/auth";
    import type { Role } from "$lib/config/roles";
    import { formatDate, formatDateTime } from "$lib/utils";
    import type { UserWithRole } from "better-auth/plugins";
    import SimpleIconsDiscord from "~icons/simple-icons/discord";
    import SvgSpinnersBlocksScale from "~icons/svg-spinners/blocks-scale";
    import TablerBan from "~icons/tabler/ban";
    import TablerCheck from "~icons/tabler/check";
    import TablerClock from "~icons/tabler/clock";
    import TablerClockQuestion from "~icons/tabler/clock-question";
    import TablerCopy from "~icons/tabler/copy";
    import TablerIdBadge from "~icons/tabler/id-badge";
    import TablerLogin2 from "~icons/tabler/login-2";
    import TablerQuestionMark from "~icons/tabler/question-mark";
    import TablerTrash from "~icons/tabler/trash";
    import TablerUserX from "~icons/tabler/user-x";
    import TablerWorldX from "~icons/tabler/world-x";
    import SessionCard from "./SessionCard.svelte";
    import Avatar from "./ui/Avatar.svelte";
    import Badge from "./ui/Badge.svelte";
    import Button from "./ui/Button.svelte";
    import RoleBadge from "./ui/RoleBadge.svelte";

    interface Props {
        user: UserWithRole & { discordId?: string };
        onBanToggle: (userId: string, banned: boolean) => void;
        onRemove: (userId: string) => void;
        isCurrentUser?: boolean;
        isProcessing?: boolean;
    }

    let { user, onBanToggle, onRemove, isCurrentUser = false, isProcessing = false }: Props = $props();

    let activeTab = $state<"overview" | "sessions" | "accounts">("overview");
    const tabs: Array<"overview" | "sessions" | "accounts"> = ["overview", "sessions", "accounts"];

    let copied: Record<string, boolean> = $state({});
    let sessionsRefreshKey = $state(0);

    function copyToClipboard(text: string, id: string) {
        navigator.clipboard.writeText(text);
        copied[id] = true;
        setTimeout(() => {
            copied[id] = false;
        }, 2000);
    }
</script>

<div class="flex size-full flex-col overflow-hidden">
    <!-- User Header Card -->
    <div>
        <div class="mb-4 flex items-center gap-4">
            <Avatar src={user.image} name={user.name} role={user.role as Role} size="lg" />
            <div class="flex-1 overflow-hidden">
                <h3 class="truncate text-sm font-medium text-stone-50">{user.name}</h3>
                <p class="truncate text-xs text-stone-400">{user.email}</p>
            </div>
        </div>

        <!-- Status Badge -->
        <div class="mb-4 flex gap-2">
            {#if user.banned}
                <Badge variant="red" content="Banned" />
            {:else}
                <Badge variant="green" content="Active" />
            {/if}
            <RoleBadge role={user.role as Role} />
        </div>

        <!-- Tab Navigation -->
        <div class="flex gap-1 border-b border-stone-700/50">
            {#each tabs as tab (tab)}
                <button
                    onclick={() => (activeTab = tab)}
                    class="flex-1 cursor-pointer border-b-2 px-2 py-2 text-sm font-medium transition-colors duration-200 {activeTab === tab
                        ? 'border-stone-50 text-stone-50'
                        : 'border-transparent text-stone-400 hover:text-stone-200'}"
                >
                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
            {/each}
        </div>
    </div>

    <!-- Tab Content -->
    <div class="flex-1 overflow-y-auto py-4 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {#if activeTab === "overview"}
            <div class="space-y-4">
                <!-- Discord ID -->
                <div class="space-y-1">
                    <div class="flex items-center gap-1 text-xs font-medium text-stone-400">
                        <SimpleIconsDiscord class="size-4" />
                        <span>Discord ID</span>
                    </div>
                    <div class="flex items-center gap-2">
                        <code class="flex-1 truncate rounded-lg bg-stone-800 px-3 py-2 font-mono text-xs text-stone-300">
                            {user.discordId || "N/A"}
                        </code>
                        {#if user.discordId}
                            {@const discordId = user.discordId}
                            <Button
                                size="icon"
                                variant={copied.discordId ? "success" : "base"}
                                onclick={() => copyToClipboard(discordId, "discordId")}
                                tooltip={copied.discordId ? "Copied!" : "Copy"}
                                tooltipPlacement="bottom"
                            >
                                {#if copied.discordId}
                                    <TablerCheck />
                                {:else}
                                    <TablerCopy />
                                {/if}
                            </Button>
                        {/if}
                    </div>
                </div>

                <!-- User ID -->
                <div class="space-y-1">
                    <div class="flex items-center gap-1 text-xs font-medium text-stone-400">
                        <TablerIdBadge class="size-4" />
                        <span>User ID</span>
                    </div>
                    <div class="flex items-center gap-2">
                        <code class="flex-1 truncate rounded-lg bg-stone-800 px-3 py-2 font-mono text-xs text-stone-300">
                            {user.id}
                        </code>
                        <Button
                            size="icon"
                            variant={copied.userId ? "success" : "base"}
                            class="size-8"
                            onclick={() => copyToClipboard(user.id, "userId")}
                            tooltip={copied.userId ? "Copied!" : "Copy"}
                            tooltipPlacement="bottom"
                        >
                            {#if copied.userId}
                                <TablerCheck />
                            {:else}
                                <TablerCopy />
                            {/if}
                        </Button>
                    </div>
                </div>

                <!-- Joined Date -->
                <div class="space-y-1">
                    <div class="flex items-center gap-1 text-xs font-medium text-stone-400">
                        <TablerLogin2 class="size-4" />
                        <span>Joined</span>
                    </div>
                    <p class="text-sm text-stone-200">{formatDateTime(user.createdAt)}</p>
                </div>

                <!-- Last Active -->
                <div class="space-y-1">
                    <div class="flex items-center gap-1 text-xs font-medium text-stone-400">
                        <TablerClock class="size-4" />
                        <span>Last Active</span>
                    </div>
                    <p class="text-sm text-stone-200">{formatDateTime(user.updatedAt)}</p>
                </div>

                <!-- Ban Status -->
                <div class="space-y-1">
                    <div class="flex items-center gap-1 text-xs font-medium text-stone-400">
                        <TablerBan class="size-4" />
                        <span>Ban Status</span>
                    </div>
                    {#if user.banned}
                        <div class="space-y-2 rounded-lg bg-stone-800 px-3 py-2">
                            <div class="flex items-center gap-1 text-sm">
                                <div class="flex items-center gap-1 font-medium text-stone-400">
                                    <TablerClockQuestion class="size-4" />
                                    <span>Duration:</span>
                                </div>
                                <p class="text-stone-200">{user.banExpires ? formatDate(user.banExpires) : "Permanent"}</p>
                            </div>
                            {#if user.banReason}
                                <div class="flex items-center gap-1 text-sm">
                                    <div class="flex items-center gap-1 font-medium text-stone-400">
                                        <TablerQuestionMark class="size-4" />
                                        <span>Reason:</span>
                                    </div>
                                    <p class="text-stone-200">{user.banReason}</p>
                                </div>
                            {/if}
                        </div>
                    {:else}
                        <p class="text-sm text-stone-200">Not banned</p>
                    {/if}
                </div>
            </div>
        {:else if activeTab === "sessions"}
            {#key sessionsRefreshKey}
                {#await authClient.admin.listUserSessions({ userId: user.id })}
                    <div class="py-8">
                        <SvgSpinnersBlocksScale class="mx-auto size-12 text-stone-400" />
                    </div>
                {:then response}
                    {#if !response.data || response.data.sessions.length === 0}
                        <div class="flex items-center justify-center rounded-lg bg-stone-800 px-2 py-8">
                            <div class="flex items-center gap-2 text-stone-400">
                                <TablerUserX class="size-6" />
                                <span>No active sessions found</span>
                            </div>
                        </div>
                    {:else}
                        <div class="space-y-2">
                            {#each response.data.sessions as session (session.id)}
                                <SessionCard
                                    sessionData={session}
                                    onRevoke={async () => {
                                        await authClient.admin.revokeUserSession({ sessionToken: session.token });
                                        sessionsRefreshKey++;
                                    }}
                                />
                            {/each}
                        </div>
                    {/if}
                {/await}
            {/key}
        {:else if activeTab === "accounts"}
            <div class="flex items-center justify-center rounded-lg bg-stone-800 px-2 py-8">
                <div class="flex items-center gap-2 text-stone-400">
                    <TablerWorldX class="size-6" />
                    <span>Not implemented yet</span>
                </div>
            </div>
        {/if}
    </div>

    <!-- Action Buttons Footer -->
    <div class="border-t border-stone-700/50 pt-4">
        {#if !isCurrentUser}
            <div class="space-y-2">
                <!-- Ban/Unban Button -->
                <Button
                    class="w-full gap-2"
                    variant={user.banned ? "success" : "danger"}
                    disabled={isProcessing}
                    onclick={() => onBanToggle(user.id, user.banned as boolean)}
                >
                    {#if user.banned}
                        <TablerCheck class="size-5" />
                        Unban User
                    {:else}
                        <TablerBan class="size-5" />
                        Ban User
                    {/if}
                </Button>

                <!-- Remove Button -->
                <Button class="w-full gap-2" variant="danger" disabled={isProcessing} onclick={() => onRemove(user.id)}>
                    <TablerTrash class="size-5" />
                    Remove User
                </Button>
            </div>
        {:else}
            <p class="text-center text-xs text-stone-400">You cannot manage your own account</p>
        {/if}
    </div>
</div>
