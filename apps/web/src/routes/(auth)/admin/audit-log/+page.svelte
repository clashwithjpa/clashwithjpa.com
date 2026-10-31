<script lang="ts">
    import { authClient } from "#lib/auth.js";
    import AuditActorAvatar from "#lib/components/audit/AuditActorAvatar.svelte";
    import AuditEventSidebar, { type AuditFilterRequest } from "#lib/components/audit/AuditEventSidebar.svelte";
    import AuditMention from "#lib/components/audit/AuditMention.svelte";
    import AuditSentence from "#lib/components/audit/AuditSentence.svelte";
    import Button from "#lib/components/ui/Button.svelte";
    import Dialog from "#lib/components/ui/Dialog.svelte";
    import Input from "#lib/components/ui/Input.svelte";
    import PageHeader from "#lib/components/ui/PageHeader.svelte";
    import Select from "#lib/components/ui/Select.svelte";
    import Seo from "#lib/components/ui/Seo.svelte";
    import { Sidebar, sidebarStore } from "#lib/components/ui/sidebar/index.js";
    import UserCombobox, { type ComboboxUser } from "#lib/components/ui/UserCombobox.svelte";
    import UserManagementSidebar from "#lib/components/UserManagementSidebar.svelte";
    import {
        auditActionOptions,
        auditRangeOptions,
        auditSourceOptions,
        auditTargetOptions,
        createResolver,
        describe,
        EMPTY_LOOKUP,
        mergeLookups,
        type AuditEntry,
        type AuditLookup,
    } from "#lib/config/auditLog.js";
    import { toast } from "#lib/toast.js";
    import { cn, errorMessage, formatDate, formatDateTime } from "#lib/utils.js";
    import { replaceState } from "$app/navigation";
    import { page } from "$app/state";
    import {
        getAdminUsers,
        getAuditLog,
        getAuditLogEntry,
        type GetAuditLogActionKey,
        type GetAuditLogSourceKey,
        type GetAuditLogTargetTypeKey,
    } from "@repo/clashofclans-client";
    import type { UserWithRole } from "better-auth/plugins";
    import { onMount, untrack } from "svelte";
    import TablerCheck from "~icons/tabler/check";
    import TablerHistory from "~icons/tabler/history";
    import TablerLink from "~icons/tabler/link";
    import TablerRefresh from "~icons/tabler/refresh";
    import TablerSearch from "~icons/tabler/search";
    import TablerX from "~icons/tabler/x";

    const PAGE_SIZE = 50;

    let entries = $state<AuditEntry[]>([]);
    let lookup = $state<AuditLookup>(EMPTY_LOOKUP);
    let total = $state(0);
    let loading = $state(true);
    let loadingMore = $state(false);

    let actionFilter = $state("");
    let targetTypeFilter = $state("");
    let sourceFilter = $state("");
    let rangeFilter = $state("");
    let search = $state("");
    let debouncedSearch = $state("");
    // Events the user did or was involved in (actor, target, subject or bulk row).
    let userFilter = $state<ComboboxUser | null>(null);
    // Set from the event sidebar ("events for this target/account"); shown as a removable chip.
    let scope = $state<{ filter: AuditFilterRequest; label: string } | null>(null);

    const resolver = $derived(createResolver(lookup));

    // Ignores responses from superseded requests, so fast filter changes can't land out of order.
    let requestSeq = 0;

    function query(offset: number) {
        const days = Number(rangeFilter);
        return {
            limit: PAGE_SIZE,
            offset,
            action: (actionFilter || undefined) as GetAuditLogActionKey | undefined,
            targetType: ((scope?.filter.targetType ?? targetTypeFilter) || undefined) as GetAuditLogTargetTypeKey | undefined,
            targetId: scope?.filter.targetId,
            source: (sourceFilter || undefined) as GetAuditLogSourceKey | undefined,
            involvingUserId: userFilter?.id,
            q: (scope?.filter.q ?? debouncedSearch.trim()) || undefined,
            after: days ? new Date(Date.now() - days * 86_400_000).toISOString() : undefined,
        };
    }

    async function load(append = false) {
        const seq = ++requestSeq;
        if (append) loadingMore = true;
        else loading = true;
        try {
            const resp = await getAuditLog({ query: query(append ? entries.length : 0) });
            if (seq !== requestSeq) return;
            if (!resp.data) {
                toast.error("Failed to load audit log");
                return;
            }
            const data = resp.data.data;
            entries = append ? [...entries, ...data.entries] : data.entries;
            // Always merged, never replaced: the event open in the sidebar may reference people who
            // aren't on the new page, and dropping them would show those people as ghosts.
            lookup = mergeLookups(lookup, data.lookup);
            total = data.total;
        } catch (e) {
            if (seq === requestSeq) toast.error("Failed to load audit log", { description: errorMessage(e) });
        } finally {
            if (seq === requestSeq) {
                loading = false;
                loadingMore = false;
            }
        }
    }

    $effect(() => {
        const value = search;
        const handle = setTimeout(() => (debouncedSearch = value), 300);
        return () => clearTimeout(handle);
    });

    $effect(() => {
        actionFilter;
        targetTypeFilter;
        sourceFilter;
        rangeFilter;
        debouncedSearch;
        userFilter;
        scope;
        untrack(() => load());
    });

    function resetFilters() {
        actionFilter = "";
        targetTypeFilter = "";
        sourceFilter = "";
        rangeFilter = "";
        search = "";
        debouncedSearch = "";
        userFilter = null;
        scope = null;
    }

    let sentinel = $state<HTMLDivElement | null>(null);

    function scrollParent(el: HTMLElement): HTMLElement | null {
        for (let p = el.parentElement; p; p = p.parentElement) {
            if (/(auto|scroll)/.test(getComputedStyle(p).overflowY)) return p;
        }
        return null;
    }

    // Starts the next page a screen before the end, so scrolling rarely has to wait. Re-armed after
    // every load: if the sentinel is still on screen then, the fresh observer fires again right away.
    $effect(() => {
        entries.length;
        if (!sentinel) return;
        const observer = new IntersectionObserver(
            (seen) => {
                if (seen[0]?.isIntersecting && !loading && !loadingMore && entries.length < total) load(true);
            },
            { root: scrollParent(sentinel), rootMargin: "600px 0px" },
        );
        observer.observe(sentinel);
        return () => observer.disconnect();
    });

    const hasFilters = $derived(!!(actionFilter || targetTypeFilter || sourceFilter || rangeFilter || search || userFilter || scope));

    async function searchUsers(q: string): Promise<ComboboxUser[]> {
        try {
            const resp = await getAdminUsers({ query: { search: q, limit: 8 } });
            if (resp.data) return resp.data.data.users as ComboboxUser[];
        } catch {
            // return empty on failure
        }
        return [];
    }

    // ── Day grouping ──
    const dayFmt = new Intl.DateTimeFormat(undefined, { weekday: "long", month: "short", day: "numeric" });
    const timeFmt = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" });
    function dayLabel(d: Date) {
        const today = new Date();
        const startOf = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
        const diff = Math.round((startOf(today) - startOf(d)) / 86_400_000);
        if (diff === 0) return "Today";
        if (diff === 1) return "Yesterday";
        if (d.getFullYear() !== today.getFullYear()) return formatDate(d);
        return dayFmt.format(d);
    }
    const groups = $derived.by(() => {
        const out: { label: string; entries: AuditEntry[] }[] = [];
        for (const e of entries) {
            const label = dayLabel(new Date(e.createdAt));
            const last = out.at(-1);
            if (last?.label === label) last.entries.push(e);
            else out.push({ label, entries: [e] });
        }
        return out;
    });

    // ── Event sidebar ──
    let eventSidebar: Sidebar | null = $state(null);
    let selected = $state<AuditEntry | null>(null);

    function setEventParam(id: number | null) {
        const url = new URL(page.url.href);
        if (id === null) url.searchParams.delete("event");
        else url.searchParams.set("event", String(id));
        if (url.href !== page.url.href) replaceState(url, page.state);
    }

    let copiedId = $state<number | null>(null);

    async function copyEventLink(id: number) {
        const url = new URL(page.url.href);
        url.search = "";
        url.searchParams.set("event", String(id));
        try {
            await navigator.clipboard.writeText(url.href);
            copiedId = id;
            setTimeout(() => (copiedId = copiedId === id ? null : copiedId), 1500);
        } catch {
            toast.error("Couldn't copy to clipboard");
        }
    }

    function openEvent(entry: AuditEntry) {
        selected = entry;
        eventSidebar?.open(`event-${entry.id}`);
        setEventParam(entry.id);
    }

    // The layout's close button clears the store directly, so the URL follows the store.
    $effect(() => {
        if (!sidebarStore.isOpen && selected) {
            untrack(() => {
                selected = null;
                setEventParam(null);
            });
        }
    });

    onMount(async () => {
        const id = Number(page.url.searchParams.get("event"));
        if (!Number.isInteger(id) || id <= 0) return;
        const resp = await getAuditLogEntry({ path: { id } });
        if (!resp.data) {
            toast.error("That audit event doesn't exist");
            setEventParam(null);
            return;
        }
        lookup = mergeLookups(lookup, resp.data.data.lookup);
        openEvent(resp.data.data.entry);
    });

    function applyScope(filter: AuditFilterRequest, label: string) {
        if (filter.involvingUserId) {
            const u = resolver.user(filter.involvingUserId);
            userFilter = { id: filter.involvingUserId, name: u.name, image: u.image, role: u.role, discordId: u.discordId };
            scope = null;
            return;
        }
        scope = { filter, label };
        actionFilter = "";
        targetTypeFilter = "";
        search = "";
        debouncedSearch = "";
    }

    // ── User management (same flow as the users page) ──
    const session = authClient.useSession();
    let userSidebar: Sidebar | null = $state(null);
    let selectedSidebarUser = $state<(UserWithRole & { discordId?: string }) | null>(null);
    let isProcessing = $state<string | null>(null);
    let banUserDialogOpen = $state(false);
    let banTarget = $state<{ userId: string; reason: string; duration: Date[] }>({ userId: "", reason: "", duration: [] });

    async function manageUser(userId: string) {
        const { data, error } = await authClient.admin.getUser({ query: { id: userId } });
        if (error || !data) {
            toast.error("Failed to load user", { description: error?.message ?? "User no longer exists" });
            return;
        }
        selectedSidebarUser = { ...(data as UserWithRole), discordId: resolver.user(userId).discordId ?? undefined };
        userSidebar?.open(userId);
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
            if (selectedSidebarUser?.id === userId) {
                userSidebar?.close();
                selectedSidebarUser = null;
            }
            load();
        }
        isProcessing = null;
    }

    function getMinDate(): string {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        return tomorrow.toISOString().split("T")[0];
    }
</script>

{#snippet dayHeading(label: string | null)}
    <div class="flex items-center gap-3 pb-1">
        {#if label}
            <h2 class="shrink-0 text-xs font-medium tracking-wide text-stone-500 uppercase">{label}</h2>
        {:else}
            <div class="flex h-4 items-center"><div class="h-3 w-20 skeleton"></div></div>
        {/if}
        <div class="h-px flex-1 bg-stone-800"></div>
    </div>
{/snippet}

<!-- Same box as a real row: avatar with its action badge, a 24px sentence line, a 16px time line. -->
{#snippet rowSkeleton(i: number)}
    <div class="-mx-2 flex items-start gap-3 px-2 py-2.5">
        <div class="relative size-10 shrink-0">
            <div class="size-10 skeleton rounded-full"></div>
            <div class="absolute -right-1 -bottom-1 size-5 skeleton rounded-full ring-2 ring-stone-950"></div>
        </div>
        <div class="flex min-w-0 flex-1 flex-col">
            <div class="flex h-6 items-center gap-1.5">
                <div class="h-3.5 w-16 skeleton"></div>
                <div class="h-3.5 skeleton" style:width="{30 + ((i * 17) % 5) * 9}%"></div>
            </div>
            <div class="flex h-4 items-center"><div class="h-3 w-14 skeleton"></div></div>
        </div>
    </div>
{/snippet}

<Seo title="Audit Log" description="View server actions audit log" />

<div class="flex size-full flex-col gap-4">
    <PageHeader
        title="Audit Log"
        subtitleLoading={loading && entries.length === 0}
        subtitle="{total.toLocaleString()} event{total === 1 ? '' : 's'}{hasFilters ? ' match' : ' recorded'}"
    >
        {#snippet actions()}
            <div class="relative min-w-48 flex-1 @4xl:max-w-64">
                <TablerSearch class="pointer-events-none absolute top-1/2 left-3 z-10 size-4 -translate-y-1/2 text-stone-500" />
                <Input bind:value={search} placeholder="Search names, tags, ids…" class="pl-9" disabled={!!scope} />
            </div>
            <UserCombobox bind:value={userFilter} search={searchUsers} placeholder="Filter by user…" class="w-full @md:w-56 @md:shrink-0" />
            <Select bind:value={actionFilter} options={auditActionOptions} placeholder="Action" class="w-full @md:w-52 @md:shrink-0" />
            <Select
                bind:value={targetTypeFilter}
                options={auditTargetOptions}
                placeholder="Target"
                class="w-full @md:w-44 @md:shrink-0"
                disabled={!!scope?.filter.targetType}
            />
            <Select bind:value={sourceFilter} options={auditSourceOptions} placeholder="Source" class="w-full @md:w-36 @md:shrink-0" />
            <Select bind:value={rangeFilter} options={auditRangeOptions} placeholder="Time" class="w-full @md:w-40 @md:shrink-0" />
            <Button variant="base" class="shrink-0" tooltip="Refresh" tooltipPlacement="bottom" onclick={() => load()}>
                <TablerRefresh class="size-5" />
            </Button>
            {#if hasFilters}
                <Button variant="ghost" class="shrink-0" onclick={resetFilters}>Reset</Button>
            {/if}
        {/snippet}
    </PageHeader>

    {#if scope}
        <div class="flex flex-wrap items-center gap-2 text-sm">
            <span class="text-stone-400">Showing events for</span>
            <button
                type="button"
                class="press inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-blue-700/50 bg-blue-900 px-2 py-1 text-blue-200 transition-colors duration-200 hover:bg-blue-700 hover:text-blue-50"
                onclick={() => (scope = null)}
            >
                {scope.label}
                <TablerX class="size-3.5" />
            </button>
        </div>
    {/if}

    <div class="flex-1">
        {#if loading && entries.length === 0}
            <div class="flex flex-col gap-5" aria-busy="true">
                {#each [6, 4] as rows, g (g)}
                    <section class="flex flex-col gap-1">
                        {@render dayHeading(null)}
                        {#each { length: rows }, i (i)}
                            {@render rowSkeleton(i + g * 7)}
                        {/each}
                    </section>
                {/each}
            </div>
        {:else if entries.length === 0}
            <div class="flex size-full flex-col items-center justify-center gap-2 pt-10 text-stone-400">
                <TablerHistory class="size-12 lg:size-16" />
                <span>{hasFilters ? "No events match these filters" : "No audit events yet"}</span>
                {#if hasFilters}
                    <Button variant="ghost" onclick={resetFilters}>Clear filters</Button>
                {/if}
            </div>
        {:else}
            <div class={cn("flex flex-col gap-5 transition-opacity duration-200", loading && "opacity-60")}>
                {#each groups as group (group.label)}
                    <section class="flex flex-col gap-1">
                        {@render dayHeading(group.label)}
                        {#each group.entries as entry (entry.id)}
                            <div
                                role="button"
                                tabindex="0"
                                class={cn(
                                    "group -mx-2 flex cursor-pointer items-start gap-3 rounded-lg px-2 py-2.5 transition-colors duration-200 hover:bg-stone-800/50",
                                    selected?.id === entry.id && "bg-stone-800/70 hover:bg-stone-800/70",
                                )}
                                onclick={() => openEvent(entry)}
                                onkeydown={(e: KeyboardEvent) => {
                                    if (e.key === "Enter" || e.key === " ") {
                                        e.preventDefault();
                                        openEvent(entry);
                                    }
                                }}
                            >
                                <AuditActorAvatar {entry} {resolver} />
                                <div class="flex min-w-0 flex-1 flex-col">
                                    <p class="text-sm leading-6 wrap-break-word text-stone-300">
                                        {#if entry.actorId}
                                            <AuditMention entity={{ type: "user", id: entry.actorId }} {resolver} />
                                        {:else}
                                            <span class="font-semibold text-stone-50">System</span>
                                        {/if}
                                        <AuditSentence segments={describe(entry)} {resolver} />
                                    </p>
                                    <span class="text-xs leading-4 text-stone-500" title={formatDateTime(entry.createdAt)}>
                                        {timeFmt.format(new Date(entry.createdAt))}{entry.source === "api"
                                            ? ` · via API key ${entry.apiKeyName ?? ""}`
                                            : ""}{entry.context?.impersonatorId && entry.context.impersonatorId !== entry.actorId
                                            ? " · while impersonating"
                                            : ""}
                                    </span>
                                </div>
                                <!-- Stops its own events so copying never opens the row behind it. -->
                                <button
                                    type="button"
                                    title={copiedId === entry.id ? "Link copied" : "Copy link to this event"}
                                    aria-label="Copy link to this event"
                                    class={cn(
                                        "grid size-8 shrink-0 cursor-pointer place-items-center self-center rounded-lg text-stone-400 opacity-0 transition-all duration-200 group-hover:opacity-100 hover:bg-stone-700 hover:text-stone-50 focus-visible:opacity-100",
                                        copiedId === entry.id && "text-green-400 opacity-100 hover:text-green-400",
                                    )}
                                    onclick={(e) => {
                                        e.stopPropagation();
                                        copyEventLink(entry.id);
                                    }}
                                    onkeydown={(e) => e.stopPropagation()}
                                >
                                    {#if copiedId === entry.id}<TablerCheck class="size-4" />{:else}<TablerLink class="size-4" />{/if}
                                </button>
                            </div>
                        {/each}
                    </section>
                {/each}

                {#if entries.length < total}
                    <!-- Scrolling near this pulls the next page in; the rows below stand in until it lands. -->
                    <div bind:this={sentinel} class="flex flex-col gap-1" aria-busy="true">
                        {#each { length: 3 }, i (i)}
                            {@render rowSkeleton(i)}
                        {/each}
                    </div>
                {/if}
            </div>
        {/if}
    </div>
</div>

<Sidebar bind:this={eventSidebar}>
    {#if selected}
        <AuditEventSidebar entry={selected} {resolver} onFilter={applyScope} onManageUser={manageUser} />
    {/if}
</Sidebar>

<Sidebar bind:this={userSidebar}>
    {#if selectedSidebarUser}
        <UserManagementSidebar
            user={selectedSidebarUser}
            onBanToggle={(userId, banned) => toggleBanUser(userId, banned)}
            onRemove={(userId) => removeUser(userId)}
            onUserUpdated={(userId) => syncSidebarUser(userId)}
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
