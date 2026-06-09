<script lang="ts">
    import { PUBLIC_SERVER_URL } from "$env/static/public";
    import { authClient } from "$lib/auth";
    import { carta } from "$lib/carta";
    import Avatar from "$lib/components/ui/Avatar.svelte";
    import Button from "$lib/components/ui/Button.svelte";
    import Dialog from "$lib/components/ui/Dialog.svelte";
    import Input from "$lib/components/ui/Input.svelte";
    import Select from "$lib/components/ui/Select.svelte";
    import Seo from "$lib/components/ui/Seo.svelte";
    import { Sidebar } from "$lib/components/ui/sidebar";
    import Tooltip from "$lib/components/ui/Tooltip.svelte";
    import UserManagementSidebar from "$lib/components/UserManagementSidebar.svelte";
    import { actionConfig, actorLabel, auditActionOptions, auditTargetOptions, describeAction, type AuditEntry } from "$lib/config/auditLog";
    import { formatDate, formatDateTime, formatRelativeTime } from "$lib/utils";
    import { cardSlideIn, DURATION, fadeIn } from "$lib/utils/animations";
    import { getAuditLog, type GetAuditLogQueryParamsActionEnumKey, type GetAuditLogQueryParamsTargetTypeEnumKey } from "@repo/clashofclans-client";
    import type { UserWithRole } from "better-auth/plugins";
    import { PreRendered } from "carta-md";
    import { toast } from "svelte-sonner";
    import { slide } from "svelte/transition";
    import SvgSpinnersBlocksScale from "~icons/svg-spinners/blocks-scale";
    import SvgSpinnersRingResize from "~icons/svg-spinners/ring-resize";
    import TablerChevronDown from "~icons/tabler/chevron-down";
    import TablerChevronLeft from "~icons/tabler/chevron-left";
    import TablerChevronRight from "~icons/tabler/chevron-right";
    import TablerHistory from "~icons/tabler/history";

    const PAGE_SIZE = 50;

    const ICON_ACCENT: Record<string, string> = {
        blue: "text-blue-400",
        green: "text-green-400",
        red: "text-red-400",
        yellow: "text-yellow-400",
        ghost: "text-stone-400",
    };

    let entries = $state<AuditEntry[]>([]);
    let total = $state(0);
    let loading = $state(true);
    let actionFilter = $state<string>("");
    let targetTypeFilter = $state<string>("");
    let actorIdFilter = $state<string>("");
    let page = $state(0);
    let expanded = $state<Record<number, boolean>>({});

    // User sidebar (mirrors the admin/users page).
    const session = authClient.useSession();
    let userSidebar: Sidebar | null = $state(null);
    let selectedSidebarUser = $state<(UserWithRole & { discordId?: string }) | null>(null);
    let openingEntryId = $state<number | null>(null);
    let isProcessing = $state<string | null>(null);
    let banUserDialogOpen = $state(false);
    let banTarget = $state<{ userId: string; reason: string; duration: Date[] }>({ userId: "", reason: "", duration: [] });

    async function load() {
        loading = true;
        try {
            const resp = await getAuditLog(
                {
                    limit: PAGE_SIZE,
                    offset: page * PAGE_SIZE,
                    action: (actionFilter || undefined) as GetAuditLogQueryParamsActionEnumKey | undefined,
                    targetType: (targetTypeFilter || undefined) as GetAuditLogQueryParamsTargetTypeEnumKey | undefined,
                    actorId: actorIdFilter.trim() || undefined,
                },
                { baseURL: PUBLIC_SERVER_URL, credentials: "include" },
            );
            if (resp.success) {
                entries = resp.data.entries;
                total = resp.data.total;
            } else {
                toast.error("Failed to load audit log");
            }
        } catch (e: any) {
            toast.error("Failed to load audit log", { description: e?.message });
        } finally {
            loading = false;
        }
    }

    $effect(() => {
        actionFilter;
        targetTypeFilter;
        page;
        load();
    });

    function resetFilters() {
        actionFilter = "";
        targetTypeFilter = "";
        actorIdFilter = "";
        page = 0;
    }

    // Fetch the full user behind an actor id and open the management sidebar.
    async function openActor(entry: AuditEntry) {
        if (!entry.actorId || openingEntryId !== null) return;
        openingEntryId = entry.id;
        try {
            const { data, error } = await authClient.admin.getUser({ query: { id: entry.actorId } });
            if (error || !data) {
                toast.error("Failed to load user", { description: error?.message ?? "User no longer exists" });
                return;
            }
            selectedSidebarUser = { ...(data as UserWithRole), discordId: entry.actorDiscordId ?? undefined };
            userSidebar?.open(entry.actorId);
        } catch (e: any) {
            toast.error("Failed to load user", { description: e?.message });
        } finally {
            openingEntryId = null;
        }
    }

    function closeUserSidebar() {
        userSidebar?.close();
        selectedSidebarUser = null;
    }

    async function syncSidebarUser(userId: string) {
        const { data } = await authClient.admin.getUser({ query: { id: userId } });
        if (data && selectedSidebarUser?.id === userId) selectedSidebarUser = { ...selectedSidebarUser, ...data };
        return data;
    }

    async function banUser(userId: string, reason: string, duration: Date[]) {
        const { error } = await authClient.admin.banUser({
            userId,
            banReason: reason,
            banExpiresIn: duration.length ? Math.floor((duration[0].getTime() - Date.now()) / 1000) : undefined,
        });
        if (error) {
            toast.error("Failed to ban user", { description: error.message });
            return;
        }
        banTarget = { userId: "", reason: "", duration: [] };
        banUserDialogOpen = false;
        const refreshed = await syncSidebarUser(userId);
        toast.success(`${refreshed?.name ?? "User"} has been banned ${duration.length ? `until ${formatDate(duration[0])}` : "permanently"}`, {
            description: reason,
        });
        load();
    }

    async function toggleBanUser(userId: string, isCurrentlyBanned: boolean) {
        isProcessing = userId;
        if (isCurrentlyBanned) {
            const { error } = await authClient.admin.unbanUser({ userId });
            if (error) toast.error("Failed to unban user", { description: error.message });
            else {
                const refreshed = await syncSidebarUser(userId);
                toast.success(`${refreshed?.name ?? "User"} has been unbanned`);
                load();
            }
        } else {
            banTarget = { userId, reason: "", duration: [] };
            banUserDialogOpen = true;
        }
        isProcessing = null;
    }

    async function removeUser(userId: string) {
        isProcessing = userId;
        const { error } = await authClient.admin.removeUser({ userId });
        if (error) {
            toast.error("Failed to remove user", { description: error.message });
        } else {
            toast.success("User removed successfully");
            if (selectedSidebarUser?.id === userId) closeUserSidebar();
            load();
        }
        isProcessing = null;
    }

    function getMinDate(): string {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        return tomorrow.toISOString().split("T")[0];
    }

    const totalPages = $derived(Math.max(1, Math.ceil(total / PAGE_SIZE)));

    let renderedMetadata = $state<Record<number, string>>({});

    async function toggleDetails(entry: AuditEntry) {
        const id = entry.id;
        if (expanded[id]) {
            expanded[id] = false;
            return;
        }
        if (!renderedMetadata[id] && entry.metadata) {
            renderedMetadata[id] = await carta.render(`\`\`\`json\n${JSON.stringify(entry.metadata, null, 2)}\n\`\`\``);
        }
        expanded[id] = true;
    }
</script>

<Seo title="Audit Log" description="View server actions audit log" />

<div in:fadeIn class="flex size-full flex-col gap-4">
    <div class="flex flex-col gap-4 lg:flex-row lg:flex-wrap lg:items-end lg:justify-between">
        <div>
            <h1 class="text-2xl font-bold">Audit Log</h1>
            <p class="text-sm text-stone-400">{total} entr{total === 1 ? "y" : "ies"} recorded</p>
        </div>
        <div class="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:flex lg:flex-wrap lg:items-end">
            <Select bind:value={actionFilter} options={auditActionOptions} placeholder="Filter action" class="lg:w-56" />
            <Select bind:value={targetTypeFilter} options={auditTargetOptions} placeholder="Filter target" class="lg:w-48" />
            <Input
                bind:value={actorIdFilter}
                placeholder="Filter by actor ID"
                class="lg:w-56"
                onkeydown={(e: KeyboardEvent) => e.key === "Enter" && load()}
            />
            <Button variant="ghost" class="w-full lg:w-auto" onclick={resetFilters}>Reset</Button>
        </div>
    </div>

    <div class="flex-1">
        {#if loading}
            <div class="flex size-full items-center justify-center pt-10 text-stone-400">
                <SvgSpinnersBlocksScale class="size-12 lg:size-16" />
            </div>
        {:else if entries.length === 0}
            <div class="flex size-full flex-col items-center justify-center gap-2 pt-10 text-stone-400">
                <TablerHistory class="size-12 lg:size-16" />
                <span>No audit entries found</span>
            </div>
        {:else}
            <div class="flex flex-col gap-2">
                {#each entries as entry (entry.id)}
                    {@const cfg = actionConfig(entry.action)}
                    {@const ActionIcon = cfg.icon}
                    {@const hasMeta = !!entry.metadata && Object.keys(entry.metadata).length > 0}
                    <div
                        in:fadeIn
                        use:cardSlideIn
                        class="flex flex-col gap-1.5 rounded-lg border-2 border-stone-700/50 bg-stone-900 p-3 transition-colors duration-200 hover:border-stone-700"
                    >
                        <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
                        <div
                            class="flex flex-col gap-1.5 {hasMeta ? 'cursor-pointer' : ''}"
                            role={hasMeta ? "button" : undefined}
                            tabindex={hasMeta ? 0 : undefined}
                            aria-expanded={hasMeta ? expanded[entry.id] : undefined}
                            onclick={hasMeta ? () => toggleDetails(entry) : undefined}
                            onkeydown={hasMeta
                                ? (e: KeyboardEvent) => {
                                      if (e.key === "Enter" || e.key === " ") {
                                          e.preventDefault();
                                          toggleDetails(entry);
                                      }
                                  }
                                : undefined}
                        >
                            <div class="flex flex-wrap items-center justify-between gap-2">
                                <button
                                    type="button"
                                    onclick={(e) => {
                                        e.stopPropagation();
                                        openActor(entry);
                                    }}
                                    disabled={!entry.actorId || openingEntryId === entry.id}
                                    class="group -mx-1 flex min-w-0 items-center gap-2 rounded-lg p-1 transition-colors duration-200 enabled:cursor-pointer enabled:hover:bg-stone-800 disabled:cursor-default"
                                >
                                    <Avatar src={entry.actorCurrentImage} name={actorLabel(entry)} role={entry.actorCurrentRole} size="xs" />
                                    <span class="truncate text-sm font-medium text-stone-100 group-enabled:group-hover:text-stone-50"
                                        >{actorLabel(entry)}</span
                                    >
                                    {#if openingEntryId === entry.id}
                                        <SvgSpinnersRingResize class="size-4 shrink-0 text-stone-400" />
                                    {/if}
                                </button>
                                <div class="flex shrink-0 items-center gap-2">
                                    <Tooltip title={formatDateTime(entry.createdAt)} placement="left">
                                        <span class="font-mono text-xs whitespace-nowrap text-stone-500">{formatRelativeTime(entry.createdAt)}</span>
                                    </Tooltip>
                                    {#if hasMeta}
                                        <TablerChevronDown
                                            class="size-4 shrink-0 text-stone-400 transition-transform duration-200 {expanded[entry.id]
                                                ? 'rotate-180'
                                                : ''}"
                                        />
                                    {/if}
                                </div>
                            </div>

                            <p class="text-sm wrap-break-word text-stone-200">{describeAction(entry)}</p>

                            <div class="flex flex-wrap items-center gap-2 text-xs text-stone-400">
                                <span class="inline-flex items-center gap-1.5 rounded bg-stone-800 px-2 py-0.5 font-mono">
                                    <ActionIcon class="size-3.5 shrink-0 {ICON_ACCENT[cfg.variant] ?? ICON_ACCENT.ghost}" />
                                    {entry.action}
                                </span>
                                {#if entry.targetType}
                                    <span class="rounded bg-stone-800 px-2 py-0.5 font-mono">
                                        {entry.targetType}{entry.targetId ? `#${entry.targetId}` : ""}
                                    </span>
                                {/if}
                            </div>
                        </div>

                        {#if expanded[entry.id]}
                            <div transition:slide={{ duration: DURATION.MEDIUM }}>
                                <div class="typography max-w-none! text-sm! **:mb-0!">
                                    <PreRendered html={renderedMetadata[entry.id]} />
                                </div>
                            </div>
                        {/if}
                    </div>
                {/each}
            </div>
        {/if}
    </div>

    {#if !loading && total > PAGE_SIZE}
        <div class="flex items-center justify-center gap-2">
            <Button variant="ghost" disabled={page === 0} onclick={() => (page = Math.max(0, page - 1))}>
                <TablerChevronLeft class="size-4" /> Prev
            </Button>
            <span class="text-sm text-stone-400">Page {page + 1} / {totalPages}</span>
            <Button variant="ghost" disabled={page + 1 >= totalPages} onclick={() => (page = page + 1)}>
                Next <TablerChevronRight class="size-4" />
            </Button>
        </div>
    {/if}
</div>

<Sidebar bind:this={userSidebar}>
    {#if selectedSidebarUser}
        <UserManagementSidebar
            user={selectedSidebarUser}
            onBanToggle={(userId, banned) => toggleBanUser(userId, banned)}
            onRemove={(userId) => removeUser(userId)}
            isCurrentUser={selectedSidebarUser.id === $session.data?.user?.id}
            isProcessing={isProcessing === selectedSidebarUser.id}
        />
    {/if}
</Sidebar>

<Dialog
    bind:open={banUserDialogOpen}
    title="Ban User"
    description="Are you sure you want to ban this user?"
    confirmText="Ban"
    onConfirm={async () => {
        await banUser(banTarget.userId, banTarget.reason, banTarget.duration);
    }}
    onClose={() => {
        banTarget = { userId: "", reason: "", duration: [] };
    }}
>
    <div class="flex flex-col gap-4">
        <div class="flex flex-col items-start justify-center gap-1">
            <p class="text-sm font-medium">Reason</p>
            <Input placeholder="Enter reason for ban (optional)" bind:value={banTarget.reason} />
        </div>
        <div class="flex flex-col items-start justify-center gap-1">
            <p class="text-sm font-medium">Duration</p>
            <Input type="date" bind:value={banTarget.duration} min={getMinDate()} />
        </div>
    </div>
</Dialog>
