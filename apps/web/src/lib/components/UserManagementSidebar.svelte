<script lang="ts">
    import { goto } from "$app/navigation";
    import { PUBLIC_SERVER_URL } from "$env/static/public";
    import { authClient } from "$lib/auth";
    import type { Role } from "$lib/config/roles";
    import { ROLE_LEVELS, roleLevel } from "$lib/config/roles";
    import { formatDate, formatDateTime } from "$lib/utils";
    import { deleteCocAccount, getCOCPlayer, getUserCocAccountsByUserId, updateCocAccountExternal } from "@repo/clashofclans-client";
    import type { UserWithRole } from "better-auth/plugins";
    import { toast } from "svelte-sonner";
    import SimpleIconsDiscord from "~icons/simple-icons/discord";
    import SvgSpinnersBlocksScale from "~icons/svg-spinners/blocks-scale";
    import TablerBan from "~icons/tabler/ban";
    import TablerCheck from "~icons/tabler/check";
    import TablerClock from "~icons/tabler/clock";
    import TablerClockQuestion from "~icons/tabler/clock-question";
    import TablerCopy from "~icons/tabler/copy";
    import TablerExternalLink from "~icons/tabler/external-link";
    import TablerHash from "~icons/tabler/hash";
    import TablerIdBadge from "~icons/tabler/id-badge";
    import TablerLogin2 from "~icons/tabler/login-2";
    import TablerQuestionMark from "~icons/tabler/question-mark";
    import TablerShieldCheck from "~icons/tabler/shield-check";
    import TablerSpy from "~icons/tabler/spy";
    import TablerTrash from "~icons/tabler/trash";
    import TablerUserX from "~icons/tabler/user-x";
    import TablerWeight from "~icons/tabler/weight";
    import TablerWorld from "~icons/tabler/world";
    import TablerWorldX from "~icons/tabler/world-x";
    import SessionCard from "./SessionCard.svelte";
    import Avatar from "./ui/Avatar.svelte";
    import Badge from "./ui/Badge.svelte";
    import Button from "./ui/Button.svelte";
    import ConfirmationDialog from "./ui/ConfirmationDialog.svelte";
    import Icon from "./ui/Icon.svelte";
    import RoleBadge from "./ui/RoleBadge.svelte";
    import Tooltip from "./ui/Tooltip.svelte";

    interface Props {
        user: UserWithRole & { discordId?: string };
        onBanToggle: (userId: string, banned: boolean) => void;
        onRemove: (userId: string) => void;
        isCurrentUser?: boolean;
        isProcessing?: boolean;
    }

    let { user, onBanToggle, onRemove, isCurrentUser = false, isProcessing = false }: Props = $props();

    const currentSession = authClient.useSession();
    // Session endpoints are superadmin-only; hide the tab from anyone who can't use them.
    let canManageSessions = $derived(
        ($currentSession.data?.user?.role ?? "")
            .split(",")
            .map((r) => r.trim())
            .includes("superadmin"),
    );
    // Mirror the server's rule: can't ban/remove users at or above your own level.
    let canActOnTarget = $derived(roleLevel(user.role) < roleLevel($currentSession.data?.user?.role));
    let canImpersonateRole = $derived(roleLevel($currentSession.data?.user?.role) >= ROLE_LEVELS.superadmin);
    let canImpersonate = $derived(canImpersonateRole && canActOnTarget);
    let canRemoveRole = $derived(roleLevel($currentSession.data?.user?.role) >= ROLE_LEVELS.admin);
    // Deleting a linked CoC account is destructive (cascades to CWL applications),
    // so it mirrors the server's admin-only (sudo) gate on DELETE /coc-accounts/:id.
    let canDeleteAccount = $derived(roleLevel($currentSession.data?.user?.role) >= ROLE_LEVELS.admin);
    // Toggling external/main mirrors the server's manager+ gate on PATCH /coc-accounts/:id.
    let canToggleExternal = $derived(roleLevel($currentSession.data?.user?.role) >= ROLE_LEVELS.manager);
    let impersonating = $state(false);
    let togglingExternalId = $state<number | null>(null);

    async function handleImpersonate() {
        impersonating = true;
        const { error } = await authClient.admin.impersonateUser({ userId: user.id });
        if (error) {
            toast.error("Failed to impersonate user", { description: error.message });
            impersonating = false;
        } else {
            await $currentSession.refetch?.();
            toast.success(`Now impersonating ${user.name}`);
            await goto("/dashboard", { invalidateAll: true });
        }
    }

    let activeTab = $state<"overview" | "sessions" | "accounts">("overview");
    let tabs = $derived<Array<"overview" | "sessions" | "accounts">>(
        canManageSessions ? ["overview", "sessions", "accounts"] : ["overview", "accounts"],
    );

    let copied: Record<string, boolean> = $state({});
    let sessionsRefreshKey = $state(0);
    let accountsRefreshKey = $state(0);
    let deletingAccountId = $state<number | null>(null);

    function copyToClipboard(text: string, id: string) {
        navigator.clipboard.writeText(text);
        copied[id] = true;
        setTimeout(() => {
            copied[id] = false;
        }, 2000);
    }

    async function handleToggleExternal(account: { id: number; cocAccountTag: string; isExternal: boolean }) {
        togglingExternalId = account.id;
        const nextExternal = !account.isExternal;
        try {
            const resp = await updateCocAccountExternal(
                account.id,
                { isExternal: nextExternal },
                { baseURL: PUBLIC_SERVER_URL, credentials: "include", headers: { "Content-Type": "application/json" } },
            );
            if (resp.success) {
                toast.success(`${account.cocAccountTag} set to ${nextExternal ? "external" : "main"}`);
                accountsRefreshKey++;
            } else {
                toast.error("Failed to update external status");
            }
        } catch (err) {
            console.error("Toggle external error:", err);
            toast.error("Failed to update external status");
        } finally {
            togglingExternalId = null;
        }
    }

    async function handleDeleteAccount(account: { id: number; cocAccountTag: string }) {
        deletingAccountId = account.id;
        try {
            const resp = await deleteCocAccount(account.id, { baseURL: PUBLIC_SERVER_URL, credentials: "include" });
            if (resp.success) {
                toast.success(`Unlinked ${account.cocAccountTag}`);
                accountsRefreshKey++;
            } else {
                toast.error("Failed to unlink account");
            }
        } catch (err) {
            console.error("Delete account error:", err);
            toast.error("Failed to unlink account");
        } finally {
            deletingAccountId = null;
        }
    }
</script>

{#snippet accountActions(account: { id: number; cocAccountTag: string; isExternal: boolean })}
    <div class="flex shrink-0 items-center gap-2">
        <Button
            size="icon"
            variant={copied[`account-${account.id}`] ? "success" : "base"}
            onclick={() => copyToClipboard(account.cocAccountTag, `account-${account.id}`)}
            tooltip={copied[`account-${account.id}`] ? "Copied!" : "Copy tag"}
            tooltipPlacement="bottom"
        >
            {#if copied[`account-${account.id}`]}
                <TablerCheck />
            {:else}
                <TablerCopy />
            {/if}
        </Button>
        <Button
            size="icon"
            variant="base"
            href={`https://link.clashofclans.com/en/?action=OpenPlayerProfile&tag=${encodeURIComponent(account.cocAccountTag)}`}
            target="_blank"
            tooltip="Open in game"
            tooltipPlacement="bottom"
        >
            <TablerExternalLink />
        </Button>
        {#if canToggleExternal}
            <Button
                size="icon"
                variant={account.isExternal ? "success" : "danger"}
                disabled={togglingExternalId === account.id}
                onclick={() => handleToggleExternal(account)}
                tooltip={account.isExternal ? "Mark as main" : "Mark as external"}
                tooltipPlacement="bottom"
            >
                {#if togglingExternalId === account.id}
                    <SvgSpinnersBlocksScale />
                {:else if account.isExternal}
                    <TablerShieldCheck />
                {:else}
                    <TablerWorld />
                {/if}
            </Button>
        {/if}
        {#if canDeleteAccount}
            <ConfirmationDialog
                title="Unlink account?"
                description="Permanently unlink {account.cocAccountTag} from this user. This also removes the account's CWL applications and cannot be undone."
                confirmText="Unlink account"
                onConfirm={() => handleDeleteAccount(account)}
            >
                <Button size="icon" variant="danger" disabled={deletingAccountId === account.id} tooltip="Unlink account" tooltipPlacement="bottom">
                    {#if deletingAccountId === account.id}
                        <SvgSpinnersBlocksScale />
                    {:else}
                        <TablerTrash />
                    {/if}
                </Button>
            </ConfirmationDialog>
        {/if}
    </div>
{/snippet}

<div class="flex size-full flex-col overflow-hidden">
    <div>
        <div class="mb-4 flex items-center gap-4">
            <Avatar src={user.image} name={user.name} role={user.role as Role} size="lg" />
            <div class="flex-1 overflow-hidden">
                <h3 class="truncate text-xl font-medium text-stone-50">{user.name}</h3>
            </div>
        </div>

        <div class="mb-4 flex gap-2">
            {#if user.banned}
                <Badge variant="red" content="Banned" />
            {:else}
                <Badge variant="green" content="Active" />
            {/if}
            <RoleBadge role={user.role as Role} />
        </div>

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

    <div class="flex-1 overflow-y-auto py-4 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {#if activeTab === "overview"}
            <div class="space-y-4">
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

                <div class="space-y-1">
                    <div class="flex items-center gap-1 text-xs font-medium text-stone-400">
                        <TablerLogin2 class="size-4" />
                        <span>Joined</span>
                    </div>
                    <p class="text-sm text-stone-200">{formatDateTime(user.createdAt)}</p>
                </div>

                <div class="space-y-1">
                    <div class="flex items-center gap-1 text-xs font-medium text-stone-400">
                        <TablerClock class="size-4" />
                        <span>Last Active</span>
                    </div>
                    <p class="text-sm text-stone-200">{formatDateTime(user.updatedAt)}</p>
                </div>

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
            {#key accountsRefreshKey}
                {#await getUserCocAccountsByUserId(user.id, { baseURL: PUBLIC_SERVER_URL, credentials: "include" })}
                    <div class="py-8">
                        <SvgSpinnersBlocksScale class="mx-auto size-12 text-stone-400" />
                    </div>
                {:then response}
                    {#if !response.success || response.data.accounts.length === 0}
                        <div class="flex items-center justify-center rounded-lg bg-stone-800 px-2 py-8">
                            <div class="flex items-center gap-2 text-stone-400">
                                <TablerWorldX class="size-6" />
                                <span>No linked CoC accounts</span>
                            </div>
                        </div>
                    {:else}
                        <div class="space-y-2">
                            {#each response.data.accounts as account (account.id)}
                                <div class="rounded-lg bg-stone-800 px-3 py-2">
                                    {#await getCOCPlayer( encodeURIComponent(account.cocAccountTag), { baseURL: PUBLIC_SERVER_URL, credentials: "include" }, )}
                                        <div class="flex items-center justify-between gap-2">
                                            <div class="flex min-w-0 items-center gap-2">
                                                <SvgSpinnersBlocksScale class="size-10 shrink-0 text-stone-400" />
                                                <code class="truncate font-mono text-sm font-medium text-stone-50">{account.cocAccountTag}</code>
                                            </div>
                                            {@render accountActions(account)}
                                        </div>
                                    {:then acc}
                                        <div class="flex items-start justify-between gap-2">
                                            <div class="flex min-w-0 items-center gap-2">
                                                {#if acc.success}
                                                    <Tooltip title="Town Hall {acc.data.player.townHallLevel}" placement="top">
                                                        <Icon name="th/{acc.data.player.townHallLevel}" class="size-10 shrink-0" />
                                                    </Tooltip>
                                                {:else}
                                                    <div
                                                        class="flex size-10 shrink-0 items-center justify-center rounded-lg bg-stone-700/50 text-stone-300"
                                                    >
                                                        <TablerHash class="size-5" />
                                                    </div>
                                                {/if}
                                                <div class="min-w-0">
                                                    {#if acc.success}
                                                        <Tooltip title={acc.data.player.name} placement="top" class="block w-full text-left">
                                                            <p class="truncate text-sm font-medium text-stone-50">{acc.data.player.name}</p>
                                                        </Tooltip>
                                                    {/if}
                                                    <code class="block truncate font-mono text-xs text-stone-400">{account.cocAccountTag}</code>
                                                </div>
                                            </div>
                                            {@render accountActions(account)}
                                        </div>
                                        {#if account.isExternal || (acc.success && acc.data.player.clan)}
                                            <div class="mt-2 flex flex-wrap gap-1">
                                                {#if account.isExternal}
                                                    <Badge variant="red" content="External" icon={TablerWorld} />
                                                {/if}
                                                {#if acc.success && acc.data.player.clan}
                                                    <Badge
                                                        variant="blue"
                                                        content={acc.data.player.clan.name}
                                                        icon={acc.data.player.clan.badgeUrls.small}
                                                        iconSize="size-4"
                                                    />
                                                {/if}
                                            </div>
                                        {/if}
                                    {/await}
                                    <div class="mt-2 flex items-center gap-1 border-t border-stone-700/50 pt-2 text-xs">
                                        <TablerWeight class="size-4 text-stone-400" />
                                        <span class="text-stone-400">War Weight</span>
                                        <span class="ml-auto font-mono text-stone-200">
                                            {account.warWeight ? account.warWeight.toLocaleString() : "Not set"}
                                        </span>
                                    </div>
                                </div>
                            {/each}
                        </div>
                    {/if}
                {:catch}
                    <div class="flex items-center justify-center rounded-lg bg-stone-800 px-2 py-8">
                        <div class="flex items-center gap-2 text-stone-400">
                            <TablerWorldX class="size-6" />
                            <span>Failed to load accounts</span>
                        </div>
                    </div>
                {/await}
            {/key}
        {/if}
    </div>

    <div class="border-t border-stone-700/50 pt-4">
        {#if !isCurrentUser && canActOnTarget}
            <div class="space-y-2">
                {#if canImpersonate}
                    <Button class="w-full gap-2" variant="base" disabled={isProcessing || impersonating} onclick={handleImpersonate}>
                        <TablerSpy class="size-5" />
                        {impersonating ? "Switching..." : "Impersonate User"}
                    </Button>
                {/if}

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

                {#if canRemoveRole}
                    <Button class="w-full gap-2" variant="danger" disabled={isProcessing} onclick={() => onRemove(user.id)}>
                        <TablerTrash class="size-5" />
                        Remove User
                    </Button>
                {/if}
            </div>
        {:else if !isCurrentUser}
            <p class="text-center text-xs text-stone-400">You cannot manage a user at or above your role level</p>
        {:else}
            <p class="text-center text-xs text-stone-400">You cannot manage your own account</p>
        {/if}
    </div>
</div>
