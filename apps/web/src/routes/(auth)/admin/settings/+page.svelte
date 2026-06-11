<script lang="ts">
    import { PUBLIC_SERVER_URL } from "$env/static/public";
    import Button from "$lib/components/ui/Button.svelte";
    import ConfirmationDialog from "$lib/components/ui/ConfirmationDialog.svelte";
    import Input from "$lib/components/ui/Input.svelte";
    import type { Option } from "$lib/components/ui/Select.svelte";
    import Select from "$lib/components/ui/Select.svelte";
    import Seo from "$lib/components/ui/Seo.svelte";
    import { fadeIn } from "$lib/utils/animations";
    import {
        createCwlSeason,
        deleteCwlSeason,
        getAdminSettings,
        getCwlSeasons,
        updateAdminSettings,
        type GetAdminSettings200,
        type GetCwlSeasons200,
    } from "@repo/clashofclans-client";
    import { toast } from "svelte-sonner";
    import SvgSpinnersBlocksScale from "~icons/svg-spinners/blocks-scale";
    import SvgSpinnersRingResize from "~icons/svg-spinners/ring-resize";
    import TablerPlus from "~icons/tabler/plus";
    import TablerTrash from "~icons/tabler/trash";

    type Settings = GetAdminSettings200["data"]["settings"];
    type Season = GetCwlSeasons200["data"]["seasons"][number];

    let settings = $state<Settings>(null);
    let loading = $state(true);
    let saving = $state(false);

    let applicationsEnabled = $state(false);
    let cwlEnabled = $state(false);
    let siteMaintenanceMode = $state(false);
    let guildId = $state("");
    let currentSeasonValue = $state("");

    let seasons = $state<Season[]>([]);
    let seasonOptions = $derived<Option[]>([{ label: "None", value: "" }, ...seasons.map((s) => ({ label: s.name, value: String(s.id) }))]);
    const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const now = new Date();
    let newMonth = $state(MONTHS[now.getMonth()]);
    let newYear = $state(String(now.getFullYear()));
    let newName = $state("");
    let creatingSeason = $state(false);
    let deletingSeasonId = $state<number | null>(null);

    function syncFromSettings() {
        applicationsEnabled = settings?.applicationsEnabled ?? false;
        cwlEnabled = settings?.cwlEnabled ?? false;
        siteMaintenanceMode = settings?.siteMaintenanceMode ?? false;
        guildId = settings?.guildId ?? "";
        currentSeasonValue = settings?.currentCwlSeasonId != null ? String(settings.currentCwlSeasonId) : "";
    }

    async function loadSeasons() {
        try {
            const resp = await getCwlSeasons({ baseURL: PUBLIC_SERVER_URL, credentials: "include" });
            if (resp.success) seasons = resp.data.seasons;
        } catch {
            // season list stays as-is on failure
        }
    }

    async function load() {
        loading = true;
        try {
            const [resp] = await Promise.all([getAdminSettings({ baseURL: PUBLIC_SERVER_URL, credentials: "include" }), loadSeasons()]);
            if (resp.success) {
                settings = resp.data.settings;
                syncFromSettings();
            } else {
                toast.error("Failed to load settings");
            }
        } catch (e: any) {
            toast.error("Failed to load settings", { description: e?.message });
        } finally {
            loading = false;
        }
    }

    async function createSeason() {
        const year = Number(newYear);
        const name = (newName.trim() || `${newMonth} ${year}`).trim();
        if (!name || !Number.isInteger(year)) return;
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
                toast.error("Failed to create season");
            }
        } catch (e: any) {
            toast.error("Failed to create season", { description: e?.message });
        } finally {
            creatingSeason = false;
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
        } catch (e: any) {
            toast.error("Failed to delete season", { description: e?.message });
        } finally {
            deletingSeasonId = null;
        }
    }

    async function save() {
        saving = true;
        try {
            const resp = await updateAdminSettings(
                {
                    applicationsEnabled,
                    cwlEnabled,
                    siteMaintenanceMode,
                    guildId: guildId.trim() ? guildId.trim() : null,
                    currentCwlSeasonId: currentSeasonValue ? Number(currentSeasonValue) : null,
                },
                { baseURL: PUBLIC_SERVER_URL, credentials: "include", headers: { "Content-Type": "application/json" } },
            );
            if (resp.success) {
                settings = resp.data.settings;
                syncFromSettings();
                toast.success("Settings updated");
            } else {
                toast.error("Failed to update settings");
            }
        } catch (e: any) {
            toast.error("Failed to update settings", { description: e?.message });
        } finally {
            saving = false;
        }
    }

    load();

    let isDirty = $derived(
        !!settings &&
            (applicationsEnabled !== settings.applicationsEnabled ||
                cwlEnabled !== settings.cwlEnabled ||
                siteMaintenanceMode !== settings.siteMaintenanceMode ||
                (guildId.trim() || null) !== (settings.guildId || null) ||
                (currentSeasonValue ? Number(currentSeasonValue) : null) !== (settings.currentCwlSeasonId ?? null)),
    );
</script>

<Seo title="Admin Settings" description="Manage site settings" />

<div in:fadeIn class="flex size-full flex-col gap-6">
    <div>
        <h1 class="text-2xl font-bold">Site Settings</h1>
        <p class="text-sm text-stone-400">Toggles and configuration that apply across the site.</p>
    </div>

    {#if loading}
        <div class="flex flex-1 items-center justify-center pt-10 text-stone-400">
            <SvgSpinnersBlocksScale class="size-12 lg:size-16" />
        </div>
    {:else}
        <div class="flex max-w-2xl flex-col gap-4">
            <div class="flex items-start justify-between gap-4 rounded-lg border-2 border-stone-700/50 bg-stone-900 p-4">
                <div class="min-w-0 flex-1">
                    <h3 class="font-semibold text-stone-50">Applications enabled</h3>
                    <p class="text-xs text-stone-400">Allow users to submit clan join applications.</p>
                </div>
                <Input type="checkbox" bind:checked={applicationsEnabled} disabled={saving} />
            </div>

            <div class="flex items-start justify-between gap-4 rounded-lg border-2 border-stone-700/50 bg-stone-900 p-4">
                <div class="min-w-0 flex-1">
                    <h3 class="font-semibold text-stone-50">CWL enabled</h3>
                    <p class="text-xs text-stone-400">Allow users to apply for Clan War League.</p>
                </div>
                <Input type="checkbox" bind:checked={cwlEnabled} disabled={saving} />
            </div>

            <div class="flex items-start justify-between gap-4 rounded-lg border-2 border-red-700/50 bg-red-900/20 p-4">
                <div class="min-w-0 flex-1">
                    <h3 class="font-semibold text-red-200">Site maintenance mode</h3>
                    <p class="text-xs text-red-300/70">Restricts site to admins only. Requires sudo.</p>
                </div>
                <Input type="checkbox" bind:checked={siteMaintenanceMode} disabled={saving} />
            </div>

            <div class="flex flex-col gap-2 rounded-lg border-2 border-stone-700/50 bg-stone-900 p-4">
                <div>
                    <h3 class="font-semibold text-stone-50">Discord Guild ID</h3>
                    <p class="text-xs text-stone-400">Used for Discord integration. Requires sudo.</p>
                </div>
                <Input bind:value={guildId} placeholder="Discord guild snowflake" disabled={saving} />
            </div>

            <div class="flex flex-col gap-3 rounded-lg border-2 border-stone-700/50 bg-stone-900 p-4">
                <div>
                    <h3 class="font-semibold text-stone-50">CWL season</h3>
                    <p class="text-xs text-stone-400">
                        The active season new CWL applications attach to and the bonus page defaults to. Create one per CWL round — two in a month is
                        fine.
                    </p>
                </div>

                <Select options={seasonOptions} bind:value={currentSeasonValue} placeholder="No active season" disabled={saving} />

                {#if seasons.length > 0}
                    <div class="flex flex-col gap-1.5">
                        {#each seasons as season (season.id)}
                            <div class="flex items-center justify-between gap-2 rounded-md border border-stone-700/50 bg-stone-800/50 px-3 py-2">
                                <div class="flex min-w-0 items-center gap-2">
                                    <span class="truncate text-sm font-medium text-stone-100">{season.name}</span>
                                    {#if String(season.id) === currentSeasonValue}
                                        <span class="rounded bg-green-900/40 px-1.5 py-0.5 text-[10px] font-semibold text-green-300">CURRENT</span>
                                    {/if}
                                </div>
                                <ConfirmationDialog
                                    title="Delete {season.name}?"
                                    description="This permanently deletes the season and cascades to its CWL applications and awarded bonuses. This cannot be undone."
                                    confirmText="Delete"
                                    onConfirm={() => deleteSeason(season.id)}
                                >
                                    <Button variant="danger" class="shrink-0 px-2" disabled={deletingSeasonId === season.id} tooltip="Delete season">
                                        {#if deletingSeasonId === season.id}
                                            <SvgSpinnersRingResize class="size-4" />
                                        {:else}
                                            <TablerTrash class="size-4" />
                                        {/if}
                                    </Button>
                                </ConfirmationDialog>
                            </div>
                        {/each}
                    </div>
                {/if}

                <div class="flex flex-col gap-2 border-t border-stone-700/50 pt-3">
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

            <div class="flex justify-end">
                <Button onclick={save} disabled={saving || !isDirty}>
                    {#if saving}
                        <span class="flex items-center gap-2"><SvgSpinnersRingResize class="size-4" /> Saving...</span>
                    {:else}
                        Save Changes
                    {/if}
                </Button>
            </div>
        </div>
    {/if}
</div>
