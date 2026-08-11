<script lang="ts">
    import { beforeNavigate, goto } from "$app/navigation";
    import { PUBLIC_SERVER_URL } from "$env/static/public";
    import Badge from "$lib/components/ui/Badge.svelte";
    import Button from "$lib/components/ui/Button.svelte";
    import ConfirmationDialog from "$lib/components/ui/ConfirmationDialog.svelte";
    import Dialog from "$lib/components/ui/Dialog.svelte";
    import Input from "$lib/components/ui/Input.svelte";
    import type { Option } from "$lib/components/ui/Select.svelte";
    import Select from "$lib/components/ui/Select.svelte";
    import Seo from "$lib/components/ui/Seo.svelte";
    import Toggle from "$lib/components/ui/Toggle.svelte";
    import Tooltip from "$lib/components/ui/Tooltip.svelte";
    import { errorMessage, formatDateTime, formatRelativeTime } from "$lib/utils";
    import {
        createCwlSeason,
        deleteCwlSeason,
        getAdminSettings,
        getCwlPingSettings,
        getCwlSeasons,
        refreshDiscordUsernames,
        renameCwlSeason,
        runCwlPingNow,
        testCwlPingWebhook,
        updateAdminSettings,
        updateCwlPingSettings,
        type GetAdminSettings200,
        type GetCwlPingSettings200,
        type GetCwlSeasons200,
    } from "@repo/clashofclans-client";
    import { onMount } from "svelte";
    import { toast } from "svelte-sonner";
    import SimpleIconsDiscord from "~icons/simple-icons/discord";
    import SvgSpinnersBlocksScale from "~icons/svg-spinners/blocks-scale";
    import SvgSpinnersRingResize from "~icons/svg-spinners/ring-resize";
    import TablerBellRinging from "~icons/tabler/bell-ringing";
    import TablerCalendarEvent from "~icons/tabler/calendar-event";
    import TablerClock from "~icons/tabler/clock";
    import TablerFileDescription from "~icons/tabler/file-description";
    import TablerInfoCircle from "~icons/tabler/info-circle";
    import TablerPencil from "~icons/tabler/pencil";
    import TablerPlayerPlay from "~icons/tabler/player-play";
    import TablerPlus from "~icons/tabler/plus";
    import TablerRefresh from "~icons/tabler/refresh";
    import TablerSend from "~icons/tabler/send";
    import TablerSwords from "~icons/tabler/swords";
    import TablerTool from "~icons/tabler/tool";
    import TablerTrash from "~icons/tabler/trash";
    import type { PageProps } from "./$types";

    let { data }: PageProps = $props();

    type Settings = GetAdminSettings200["data"]["settings"];
    type CwlPingSettings = GetCwlPingSettings200["data"]["settings"];
    type Season = GetCwlSeasons200["data"]["seasons"][number];

    let settings = $state<Settings>(null);
    let cwlPingSettings = $state<CwlPingSettings>(null);
    let loading = $state(true);
    let saving = $state(false);
    let refreshingUsernames = $state(false);
    let testingWebhook = $state(false);
    let runningPingNow = $state(false);

    let applicationsEnabled = $state(false);
    let cwlEnabled = $state(false);
    let siteMaintenanceMode = $state(false);
    let guildId = $state("");
    let currentSeasonValue = $state("");

    let cwlPingEnabled = $state(false);
    let cwlPingWebhookUrl = $state("");
    let cwlPingIntervalMinutes = $state("30");

    let seasons = $state<Season[]>([]);
    let seasonOptions = $derived<Option[]>([{ label: "None", value: "" }, ...seasons.map((s) => ({ label: s.name, value: String(s.id) }))]);
    const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const now = new Date();
    let newMonth = $state(MONTHS[now.getMonth()]);
    let newYear = $state(String(now.getFullYear()));
    let newName = $state("");
    let creatingSeason = $state(false);
    let deletingSeasonId = $state<number | null>(null);
    let seasonSearch = $state("");
    let filteredSeasons = $derived(
        seasonSearch.trim() ? seasons.filter((s) => s.name.toLowerCase().includes(seasonSearch.trim().toLowerCase())) : seasons,
    );

    let editDialogOpen = $state(false);
    let editingSeasonId = $state<number | null>(null);
    let editingName = $state("");
    let renamingSeason = $state(false);

    function syncFromSettings() {
        applicationsEnabled = settings?.applicationsEnabled ?? false;
        cwlEnabled = settings?.cwlEnabled ?? false;
        siteMaintenanceMode = settings?.siteMaintenanceMode ?? false;
        guildId = settings?.guildId ?? "";
        currentSeasonValue = settings?.currentCwlSeasonId != null ? String(settings.currentCwlSeasonId) : "";
    }

    function syncFromCwlPingSettings() {
        cwlPingEnabled = cwlPingSettings?.enabled ?? false;
        cwlPingWebhookUrl = cwlPingSettings?.webhookUrl ?? "";
        cwlPingIntervalMinutes = String(cwlPingSettings?.intervalMinutes ?? 5);
    }

    async function loadSeasons() {
        try {
            const resp = await getCwlSeasons({ baseURL: PUBLIC_SERVER_URL, credentials: "include" });
            if (resp.success) seasons = resp.data.seasons;
        } catch {
            // season list stays as-is on failure
        }
    }

    async function loadCwlPingSettings() {
        if (!data.isSuperadmin) return;
        try {
            const resp = await getCwlPingSettings({ baseURL: PUBLIC_SERVER_URL, credentials: "include" });
            if (resp.success) {
                cwlPingSettings = resp.data.settings;
                syncFromCwlPingSettings();
            }
        } catch {
            // CWL ping panel stays as-is on failure
        }
    }

    async function load() {
        loading = true;
        try {
            const [resp] = await Promise.all([
                getAdminSettings({ baseURL: PUBLIC_SERVER_URL, credentials: "include" }),
                loadSeasons(),
                loadCwlPingSettings(),
            ]);
            if (resp.success) {
                settings = resp.data.settings;
                syncFromSettings();
            } else {
                toast.error("Failed to load settings");
            }
        } catch (e) {
            toast.error("Failed to load settings", { description: errorMessage(e) });
        } finally {
            loading = false;
        }
    }

    // API error responses aren't always a string (zod validation failures come back as an
    // issue object) — toasting a non-string crashes svelte-sonner's title renderer.
    function apiErrorMessage(resp: unknown, fallback: string): string {
        const err = (resp as { error?: unknown } | undefined)?.error;
        return typeof err === "string" ? err : fallback;
    }

    function nextAvailableName(base: string): string {
        if (!seasons.some((s) => s.name === base)) return base;
        let suffix = 2;
        while (seasons.some((s) => s.name === `${base} ${suffix}`)) suffix++;
        return `${base} ${suffix}`;
    }

    async function createSeason() {
        const year = Number(newYear);
        if (!Number.isInteger(year)) return;
        const base = (newName.trim() || `${newMonth} ${year}`).trim();
        if (!base) return;
        const name = nextAvailableName(base);
        creatingSeason = true;
        try {
            const resp = await createCwlSeason(
                { name, month: newMonth, year },
                { baseURL: PUBLIC_SERVER_URL, credentials: "include", headers: { "Content-Type": "application/json" } },
            );
            if (resp.success) {
                toast.success(`Season "${name}" created`);
                newName = "";
                await loadSeasons();
            } else {
                toast.error(apiErrorMessage(resp, "Failed to create season"));
            }
        } catch (e) {
            toast.error("Failed to create season", { description: errorMessage(e) });
        } finally {
            creatingSeason = false;
        }
    }

    function openEditDialog(season: Season) {
        editingSeasonId = season.id;
        editingName = season.name;
        editDialogOpen = true;
    }

    async function renameSeason() {
        if (!editingSeasonId) return;
        const name = editingName.trim();
        if (!name) return;
        renamingSeason = true;
        try {
            const resp = await renameCwlSeason(
                editingSeasonId,
                { name },
                { baseURL: PUBLIC_SERVER_URL, credentials: "include", headers: { "Content-Type": "application/json" } },
            );
            if (resp.success) {
                toast.success(`Season renamed to "${name}"`);
                editDialogOpen = false;
                await loadSeasons();
            } else {
                toast.error(apiErrorMessage(resp, "Failed to rename season"));
            }
        } catch (e) {
            toast.error("Failed to rename season", { description: errorMessage(e) });
        } finally {
            renamingSeason = false;
        }
    }

    async function deleteSeason(id: number) {
        deletingSeasonId = id;
        try {
            const resp = await deleteCwlSeason(id, { baseURL: PUBLIC_SERVER_URL, credentials: "include" });
            if (resp.success) {
                toast.success("Season deleted");
                await load();
            } else {
                toast.error("Failed to delete season");
            }
        } catch (e) {
            toast.error("Failed to delete season", { description: errorMessage(e) });
        } finally {
            deletingSeasonId = null;
        }
    }

    async function save() {
        saving = true;
        try {
            const opts = { baseURL: PUBLIC_SERVER_URL, credentials: "include" as const, headers: { "Content-Type": "application/json" } };
            const [resp, cwlPingResp] = await Promise.all([
                updateAdminSettings(
                    {
                        applicationsEnabled,
                        cwlEnabled,
                        siteMaintenanceMode,
                        guildId: guildId.trim() ? guildId.trim() : null,
                        currentCwlSeasonId: currentSeasonValue ? Number(currentSeasonValue) : null,
                    },
                    opts,
                ),
                data.isSuperadmin
                    ? updateCwlPingSettings(
                          {
                              enabled: cwlPingEnabled,
                              webhookUrl: cwlPingWebhookUrl.trim() ? cwlPingWebhookUrl.trim() : null,
                              intervalMinutes: Number(cwlPingIntervalMinutes) || 5,
                          },
                          opts,
                      )
                    : null,
            ]);

            if (resp.success) {
                settings = resp.data.settings;
                syncFromSettings();
            } else {
                toast.error("Failed to update settings");
            }
            if (cwlPingResp) {
                if (cwlPingResp.success) {
                    cwlPingSettings = cwlPingResp.data.settings;
                    syncFromCwlPingSettings();
                } else {
                    toast.error(apiErrorMessage(cwlPingResp, "Failed to update CWL ping settings"));
                }
            }
            if (resp.success && (!cwlPingResp || cwlPingResp.success)) toast.success("Settings updated");
        } catch (e) {
            toast.error("Failed to update settings", { description: errorMessage(e) });
        } finally {
            saving = false;
        }
    }

    async function refreshUsernames() {
        refreshingUsernames = true;
        try {
            const resp = await refreshDiscordUsernames({ baseURL: PUBLIC_SERVER_URL, credentials: "include" });
            if (resp.success) {
                toast.success(`Updated ${resp.data.updated} of ${resp.data.matched} guild members`);
            } else {
                toast.error("Failed to refresh usernames");
            }
        } catch (e) {
            toast.error("Failed to refresh usernames", { description: errorMessage(e) });
        } finally {
            refreshingUsernames = false;
        }
    }

    async function testWebhook() {
        testingWebhook = true;
        try {
            const resp = await testCwlPingWebhook(
                { webhookUrl: cwlPingWebhookUrl.trim() || undefined },
                { baseURL: PUBLIC_SERVER_URL, credentials: "include", headers: { "Content-Type": "application/json" } },
            );
            if (resp.success) toast.success("Test ping sent — check the channel.");
            else toast.error(apiErrorMessage(resp, "Failed to send test ping"));
        } catch (e) {
            toast.error("Failed to send test ping", { description: errorMessage(e) });
        } finally {
            testingWebhook = false;
        }
    }

    async function runPingNow() {
        runningPingNow = true;
        try {
            const resp = await runCwlPingNow({ baseURL: PUBLIC_SERVER_URL, credentials: "include" });
            if (resp.success) {
                const { usersPinged, clansPinged, skippedReason } = resp.data;
                toast.success(skippedReason ?? `Pinged ${usersPinged} user(s) across ${clansPinged} clan(s).`);
                await loadCwlPingSettings();
            } else {
                toast.error("Failed to run CWL ping");
            }
        } catch (e) {
            toast.error("Failed to run CWL ping", { description: errorMessage(e) });
        } finally {
            runningPingNow = false;
        }
    }

    load();

    let isCwlPingDirty = $derived(
        !!cwlPingSettings &&
            (cwlPingEnabled !== cwlPingSettings.enabled ||
                (cwlPingWebhookUrl.trim() || null) !== (cwlPingSettings.webhookUrl || null) ||
                (Number(cwlPingIntervalMinutes) || 5) !== cwlPingSettings.intervalMinutes),
    );

    let isDirty = $derived(
        !!settings &&
            (applicationsEnabled !== settings.applicationsEnabled ||
                cwlEnabled !== settings.cwlEnabled ||
                siteMaintenanceMode !== settings.siteMaintenanceMode ||
                (guildId.trim() || null) !== (settings.guildId || null) ||
                (currentSeasonValue ? Number(currentSeasonValue) : null) !== (settings.currentCwlSeasonId ?? null) ||
                isCwlPingDirty),
    );

    // Warn before leaving with unsaved setting changes (the season list and
    // active-season select left untouched). Mirrors ReadmeEditor's guard.
    let pendingNavigation = $state<string | null>(null);
    let allowNavigation = $state(false);
    let showUnsavedDialog = $state(false);

    beforeNavigate((navigation) => {
        if (isDirty && !allowNavigation) {
            navigation.cancel();
            pendingNavigation = navigation.to?.url.href || null;
            if (pendingNavigation) showUnsavedDialog = true;
        }
    });

    onMount(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (isDirty) {
                e.preventDefault();
                e.returnValue = "";
                return "";
            }
        };
        window.addEventListener("beforeunload", handleBeforeUnload);
        return () => window.removeEventListener("beforeunload", handleBeforeUnload);
    });

    function proceedNavigation() {
        if (pendingNavigation) {
            allowNavigation = true;
            goto(pendingNavigation);
        }
    }
</script>

<Seo title="Admin Settings" description="Manage site settings" />

<div class="flex size-full flex-col gap-6">
    <div>
        <h1 class="text-2xl font-bold">Site Settings</h1>
        <p class="text-sm text-stone-400">Toggles and configuration that apply across the site.</p>
    </div>

    {#if loading}
        <div class="flex flex-1 items-center justify-center pt-10 text-stone-400">
            <SvgSpinnersBlocksScale class="size-12 lg:size-16" />
        </div>
    {:else}
        <div class="grid grid-cols-1 items-start gap-6 xl:grid-cols-2">
            <!-- Left: everything the Save button governs -->
            <div class="flex flex-col gap-6">
                <!-- Feature toggles -->
                <section class="flex flex-col gap-3">
                    <h2 class="text-xs font-semibold tracking-wide text-stone-400 uppercase">Features</h2>
                    <div class="flex flex-col divide-y-2 divide-stone-700/50 overflow-hidden rounded-lg border-2 border-stone-700/50 bg-stone-900">
                        <div class="flex items-center justify-between gap-4 p-4">
                            <div class="flex min-w-0 items-start gap-3">
                                <div class="shrink-0 rounded-lg border-2 border-stone-700/50 bg-stone-800 p-2">
                                    <TablerFileDescription class="size-5 text-stone-300" />
                                </div>
                                <div class="min-w-0">
                                    <h3 class="font-semibold text-stone-50">Applications</h3>
                                    <p class="text-xs text-stone-400">Allow users to submit clan join applications.</p>
                                </div>
                            </div>
                            <Toggle bind:checked={applicationsEnabled} disabled={saving} />
                        </div>

                        <div class="flex items-center justify-between gap-4 p-4">
                            <div class="flex min-w-0 items-start gap-3">
                                <div class="shrink-0 rounded-lg border-2 border-stone-700/50 bg-stone-800 p-2">
                                    <TablerSwords class="size-5 text-stone-300" />
                                </div>
                                <div class="min-w-0">
                                    <h3 class="font-semibold text-stone-50">CWL</h3>
                                    <p class="text-xs text-stone-400">Allow users to apply for Clan War League.</p>
                                </div>
                            </div>
                            <Toggle bind:checked={cwlEnabled} disabled={saving} />
                        </div>
                    </div>
                </section>

                <!-- Active season (saved together with the settings above) -->
                <section class="flex flex-col gap-3">
                    <h2 class="text-xs font-semibold tracking-wide text-stone-400 uppercase">Active Season</h2>
                    <div class="flex flex-col gap-3 rounded-lg border-2 border-stone-700/50 bg-stone-900 p-4">
                        <div class="flex items-start gap-3">
                            <div class="shrink-0 rounded-lg border-2 border-stone-700/50 bg-stone-800 p-2">
                                <TablerCalendarEvent class="size-5 text-stone-300" />
                            </div>
                            <div class="min-w-0">
                                <h3 class="font-semibold text-stone-50">Current CWL season</h3>
                                <p class="text-xs text-stone-400">The season new CWL applications attach to and the bonus page defaults to.</p>
                            </div>
                        </div>
                        <Select options={seasonOptions} bind:value={currentSeasonValue} placeholder="No active season" disabled={saving} />
                    </div>
                </section>

                <!-- Restricted / sudo settings -->
                <section class="flex flex-col gap-3">
                    <h2 class="text-xs font-semibold tracking-wide text-stone-400 uppercase">Restricted</h2>
                    <div class="flex items-center justify-between gap-4 rounded-lg border-2 border-red-700/50 bg-red-900/20 p-4">
                        <div class="flex min-w-0 items-start gap-3">
                            <div class="shrink-0 rounded-lg border-2 border-red-700/50 bg-red-900/40 p-2">
                                <TablerTool class="size-5 text-red-200" />
                            </div>
                            <div class="min-w-0">
                                <h3 class="font-semibold text-red-200">Site maintenance mode</h3>
                                <p class="text-xs text-red-300/70">Restricts site to admins only.</p>
                            </div>
                        </div>
                        <Toggle bind:checked={siteMaintenanceMode} disabled={saving} />
                    </div>

                    <div class="flex flex-col gap-3 rounded-lg border-2 border-stone-700/50 bg-stone-900 p-4">
                        <div class="flex items-start gap-3">
                            <div class="shrink-0 rounded-lg border-2 border-stone-700/50 bg-stone-800 p-2">
                                <SimpleIconsDiscord class="size-5 text-stone-300" />
                            </div>
                            <div class="min-w-0">
                                <h3 class="font-semibold text-stone-50">Discord Guild ID</h3>
                                <p class="text-xs text-stone-400">Used for Discord integration.</p>
                            </div>
                        </div>
                        <Input bind:value={guildId} placeholder="Discord guild snowflake" disabled={saving} />
                    </div>

                    {#if data.isSuperadmin}
                        <div class="flex items-center justify-between gap-4 rounded-lg border-2 border-stone-700/50 bg-stone-900 p-4">
                            <div class="flex min-w-0 items-start gap-3">
                                <div class="shrink-0 rounded-lg border-2 border-stone-700/50 bg-stone-800 p-2">
                                    <SimpleIconsDiscord class="size-5 text-stone-300" />
                                </div>
                                <div class="min-w-0">
                                    <h3 class="font-semibold text-stone-50">Refresh Discord usernames</h3>
                                    <p class="text-xs text-stone-400">Pulls current usernames from the guild member list.</p>
                                </div>
                            </div>
                            <Button onclick={refreshUsernames} disabled={refreshingUsernames} class="shrink-0">
                                {#if refreshingUsernames}
                                    <SvgSpinnersRingResize class="size-4" />
                                {:else}
                                    <span class="flex items-center gap-1"><TablerRefresh class="size-4" /> Refresh</span>
                                {/if}
                            </Button>
                        </div>
                    {/if}
                </section>

                {#if data.isSuperadmin}
                    <section class="flex flex-col gap-3">
                        <h2 class="text-xs font-semibold tracking-wide text-stone-400 uppercase">CWL Ping</h2>
                        <div class="flex flex-col gap-4 rounded-lg border-2 border-stone-700/50 bg-stone-900 p-4">
                            <div class="flex items-center justify-between gap-4">
                                <div class="flex min-w-0 items-start gap-3">
                                    <div class="shrink-0 rounded-lg border-2 border-stone-700/50 bg-stone-800 p-2">
                                        <TablerBellRinging class="size-5 text-stone-300" />
                                    </div>
                                    <div class="min-w-0">
                                        <h3 class="font-semibold text-stone-50">CWL Pinger</h3>
                                        <p class="text-xs text-stone-400">
                                            Periodically pings CWL applicants who haven't joined their assigned clan yet. Requires root.
                                        </p>
                                    </div>
                                </div>
                                <Toggle bind:checked={cwlPingEnabled} disabled={saving} />
                            </div>

                            <Input bind:value={cwlPingWebhookUrl} placeholder="https://discord.com/api/webhooks/..." disabled={saving} />

                            <div class="flex items-center gap-3">
                                <div class="w-28">
                                    <Input type="number" bind:value={cwlPingIntervalMinutes} min={1} max={10} disabled={saving} />
                                </div>
                                <span class="text-xs text-stone-400">minutes between checks (1–10)</span>
                            </div>

                            <div class="flex flex-col gap-3 border-t-2 border-stone-700/50 pt-4">
                                {#if cwlPingSettings?.lastRunAt}
                                    <div class="flex flex-wrap items-center gap-2">
                                        <Tooltip title={formatDateTime(cwlPingSettings.lastRunAt)} placement="top">
                                            <Badge
                                                variant="yellow"
                                                iconSize="size-4"
                                                icon={TablerClock}
                                                content={`Last run ${formatRelativeTime(cwlPingSettings.lastRunAt)}`}
                                                class="cursor-help"
                                            />
                                        </Tooltip>
                                        {#if cwlPingSettings.lastRunSummary}
                                            <Badge
                                                variant="blue"
                                                icon={TablerInfoCircle}
                                                iconSize="size-4"
                                                content={cwlPingSettings.lastRunSummary}
                                            />
                                        {/if}
                                    </div>
                                {:else}
                                    <p class="text-xs text-stone-400">Hasn't run yet.</p>
                                {/if}

                                <div class="grid grid-cols-2 gap-2">
                                    <Button
                                        variant="ghost"
                                        class="w-full"
                                        onclick={testWebhook}
                                        disabled={testingWebhook || !cwlPingWebhookUrl.trim()}
                                    >
                                        <span class="flex items-center justify-center gap-1">
                                            {#if testingWebhook}
                                                <SvgSpinnersRingResize class="size-4" /> Sending...
                                            {:else}
                                                <TablerSend class="size-4" /> Send test ping
                                            {/if}
                                        </span>
                                    </Button>
                                    <Button variant="ghost" class="w-full" onclick={runPingNow} disabled={runningPingNow}>
                                        <span class="flex items-center justify-center gap-1">
                                            {#if runningPingNow}
                                                <SvgSpinnersRingResize class="size-4" /> Running...
                                            {:else}
                                                <TablerPlayerPlay class="size-4" /> Run once
                                            {/if}
                                        </span>
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </section>
                {/if}

                <div class="flex items-center justify-end gap-3">
                    {#if isDirty}
                        <span class="text-xs text-stone-400">Unsaved changes</span>
                    {/if}
                    <Button onclick={save} disabled={saving || !isDirty}>
                        {#if saving}
                            <span class="flex items-center gap-2"><SvgSpinnersRingResize class="size-4" /> Saving...</span>
                        {:else}
                            Save Changes
                        {/if}
                    </Button>
                </div>
            </div>

            <!-- Right: instant season management (not governed by Save) -->
            <section class="flex flex-col gap-3">
                <div class="flex items-center justify-between gap-2">
                    <h2 class="text-xs font-semibold tracking-wide text-stone-400 uppercase">Manage Seasons</h2>
                    {#if seasons.length > 0}
                        <span
                            class="rounded border-2 border-stone-700/50 bg-stone-900 px-1.5 py-0.5 text-[10px] font-semibold text-stone-300 uppercase"
                        >
                            {seasons.length} Total
                        </span>
                    {/if}
                </div>
                <div class="flex flex-col gap-4 rounded-lg border-2 border-stone-700/50 bg-stone-900 p-4">
                    <p class="text-xs text-stone-400">
                        Create or delete CWL seasons. Changes here apply immediately, create one per CWL round, two in a month is fine.
                    </p>

                    {#if seasons.length === 0}
                        <p class="rounded-lg border-2 border-dashed border-stone-700/50 px-3 py-6 text-center text-xs text-stone-400">
                            No seasons yet. Create your first one below.
                        </p>
                    {:else}
                        {#if seasons.length > 6}
                            <Input bind:value={seasonSearch} placeholder="Filter seasons..." />
                        {/if}
                        {#if filteredSeasons.length === 0}
                            <p class="rounded-lg border-2 border-dashed border-stone-700/50 px-3 py-6 text-center text-xs text-stone-400">
                                No seasons match "{seasonSearch}".
                            </p>
                        {:else}
                            <div class="edge-fade -mr-1 flex max-h-96 flex-col gap-2 overflow-y-auto pr-1">
                                {#each filteredSeasons as season (season.id)}
                                    <div
                                        class="flex items-center justify-between gap-2 rounded-lg border-2 border-stone-700/50 bg-stone-800/50 px-3 py-2"
                                    >
                                        <div class="flex min-w-0 items-center gap-2">
                                            <span class="truncate text-sm font-medium text-stone-100">{season.name}</span>
                                            {#if String(season.id) === currentSeasonValue}
                                                <span
                                                    class="shrink-0 rounded border border-green-700/50 bg-green-900 px-1.5 py-0.5 text-[10px] font-semibold text-green-200"
                                                >
                                                    CURRENT
                                                </span>
                                            {/if}
                                        </div>
                                        <div class="flex shrink-0 items-center gap-1">
                                            <Button variant="ghost" class="px-2" onclick={() => openEditDialog(season)} tooltip="Edit season name">
                                                <TablerPencil class="size-4" />
                                            </Button>
                                            <ConfirmationDialog
                                                title="Delete {season.name}?"
                                                description="This permanently deletes the season and cascades to its CWL applications and awarded bonuses. This cannot be undone."
                                                confirmText="Delete"
                                                onConfirm={() => deleteSeason(season.id)}
                                            >
                                                <Button
                                                    variant="danger"
                                                    class="px-2"
                                                    disabled={deletingSeasonId === season.id}
                                                    tooltip="Delete season"
                                                >
                                                    {#if deletingSeasonId === season.id}
                                                        <SvgSpinnersRingResize class="size-4" />
                                                    {:else}
                                                        <TablerTrash class="size-4" />
                                                    {/if}
                                                </Button>
                                            </ConfirmationDialog>
                                        </div>
                                    </div>
                                {/each}
                            </div>
                        {/if}
                    {/if}

                    <div class="flex flex-col gap-2 border-t-2 border-stone-700/50 pt-4">
                        <p class="text-xs font-medium text-stone-400">Create a new season</p>
                        <div class="flex flex-col gap-2 sm:flex-row">
                            <Select
                                options={MONTHS.map((m) => ({ label: m, value: m }))}
                                bind:value={newMonth}
                                class="sm:w-40"
                                disabled={creatingSeason}
                            />
                            <Input bind:value={newYear} placeholder="Year" class="sm:w-28" disabled={creatingSeason} />
                            <Input bind:value={newName} placeholder={`${newMonth} ${newYear}`} class="flex-1" disabled={creatingSeason} />
                            <Button onclick={createSeason} disabled={creatingSeason} class="shrink-0">
                                {#if creatingSeason}
                                    <SvgSpinnersRingResize class="size-4" />
                                {:else}
                                    <span class="flex items-center gap-1"><TablerPlus class="size-4" /> Add</span>
                                {/if}
                            </Button>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    {/if}
</div>

<ConfirmationDialog
    bind:open={showUnsavedDialog}
    title="Unsaved Changes"
    description="You have unsaved setting changes. Do you want to leave without saving?"
    confirmText="Leave"
    cancelText="Cancel"
    onConfirm={proceedNavigation}
>
    <span class="hidden"></span>
</ConfirmationDialog>

<Dialog
    bind:open={editDialogOpen}
    title="Edit Season Name"
    description="Change the name of this CWL season."
    confirmText={renamingSeason ? "Saving..." : "Save"}
    onConfirm={renameSeason}
>
    <Input bind:value={editingName} placeholder="Season name" disabled={renamingSeason} />
</Dialog>
