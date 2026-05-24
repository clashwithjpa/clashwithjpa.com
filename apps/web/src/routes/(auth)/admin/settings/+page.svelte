<script lang="ts">
    import { PUBLIC_SERVER_URL } from "$env/static/public";
    import Button from "$lib/components/ui/Button.svelte";
    import Input from "$lib/components/ui/Input.svelte";
    import Seo from "$lib/components/ui/Seo.svelte";
    import { fadeIn } from "$lib/utils/animations";
    import { getAdminSettings, updateAdminSettings, type GetAdminSettings200 } from "@repo/clashofclans-client";
    import { toast } from "svelte-sonner";
    import SvgSpinnersBlocksScale from "~icons/svg-spinners/blocks-scale";
    import SvgSpinnersRingResize from "~icons/svg-spinners/ring-resize";

    type Settings = GetAdminSettings200["data"]["settings"];

    let settings = $state<Settings>(null);
    let loading = $state(true);
    let saving = $state(false);

    let applicationsEnabled = $state(false);
    let cwlEnabled = $state(false);
    let siteMaintenanceMode = $state(false);
    let guildId = $state("");

    async function load() {
        loading = true;
        try {
            const resp = await getAdminSettings({ baseURL: PUBLIC_SERVER_URL, credentials: "include" });
            if (resp.success) {
                settings = resp.data.settings;
                applicationsEnabled = settings?.applicationsEnabled ?? false;
                cwlEnabled = settings?.cwlEnabled ?? false;
                siteMaintenanceMode = settings?.siteMaintenanceMode ?? false;
                guildId = settings?.guildId ?? "";
            } else {
                toast.error("Failed to load settings");
            }
        } catch (e: any) {
            toast.error("Failed to load settings", { description: e?.message });
        } finally {
            loading = false;
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
                },
                { baseURL: PUBLIC_SERVER_URL, credentials: "include", headers: { "Content-Type": "application/json" } },
            );
            if (resp.success) {
                settings = resp.data.settings;
                applicationsEnabled = settings?.applicationsEnabled ?? false;
                cwlEnabled = settings?.cwlEnabled ?? false;
                siteMaintenanceMode = settings?.siteMaintenanceMode ?? false;
                guildId = settings?.guildId ?? "";
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
                (guildId.trim() || null) !== (settings.guildId || null)),
    );
</script>

<Seo title="Admin Settings" description="Manage site settings" />

<div in:fadeIn class="flex size-full flex-col gap-6 overflow-y-auto p-2">
    <div>
        <h1 class="text-2xl font-bold">Site Settings</h1>
        <p class="text-sm text-stone-400">Toggles and configuration that apply across the site.</p>
    </div>

    {#if loading}
        <div class="flex flex-1 items-center justify-center text-stone-400">
            <SvgSpinnersBlocksScale class="size-12" />
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
