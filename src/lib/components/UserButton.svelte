<script lang="ts">
    import { invalidateAll } from "$app/navigation";
    import type { UserChecks } from "$lib/auth/user";
    import CocButton from "$lib/components/CocButton.svelte";
    import { toast } from "$lib/components/toast";
    import { Popover } from "bits-ui";
    import type { APIUser } from "discord-api-types/v10";
    import MaterialSymbolsAdminPanelSettingsRounded from "~icons/material-symbols/admin-panel-settings-rounded";
    import MaterialSymbolsCrownRounded from "~icons/material-symbols/crown-rounded";
    import MaterialSymbolsLabProfileRounded from "~icons/material-symbols/lab-profile-rounded";
    import MaterialSymbolsLogoutRounded from "~icons/material-symbols/logout-rounded";
    import MdiSwordCross from "~icons/mdi/sword-cross";

    let {
        user,
        checks,
        applicationEnabled,
        cwlEnabled
    }: { user: APIUser | null; checks: UserChecks; applicationEnabled: boolean; cwlEnabled: boolean } = $props();

    async function logout() {
        try {
            await fetch("/auth/logout");
            toast.success("Logged out successfully");
            invalidateAll();
        } catch {
            toast.error("Failed to logout");
        }
    }
</script>

{#if user}
    <Popover.Root>
        <Popover.Trigger class="cursor-pointer">
            {#if checks.isAdmin}
                <MaterialSymbolsCrownRounded class="-mb-2 size-6 -rotate-[15deg] text-yellow-400" />
            {/if}
            <img src="https://media.discordapp.net/avatars/{user.id}/{user.avatar}" alt="Avatar" class="size-8 rounded-full lg:size-11" />
        </Popover.Trigger>
        <Popover.Portal>
            <Popover.Content class="z-200 max-w-80 rounded-xl p-2">
                <div
                    class="flex flex-col gap-5 rounded-xl border border-gray-950 bg-linear-to-b from-gray-800 via-gray-800 to-gray-900 p-5 shadow-[0_0_5px_0.5px_var(--tw-shadow-color)] shadow-gray-950 backdrop-blur-md"
                >
                    <div class="flex gap-x-5">
                        <CocButton onclick={logout} class="p-2" type="danger">
                            <MaterialSymbolsLogoutRounded class="size-5 rotate-180 transition-transform" />
                            <span class="text-sm">Logout</span>
                        </CocButton>
                        <CocButton
                            href="/apply"
                            onclick={() => {
                                if (!applicationEnabled) {
                                    toast.error("Applications are currently closed");
                                }
                            }}
                            class="p-2"
                        >
                            <MaterialSymbolsLabProfileRounded class="size-5 transition-transform" />
                            <span class="text-sm">Apply</span>
                        </CocButton>
                    </div>
                    <CocButton
                        href="/cwl"
                        onclick={() => {
                            if (!cwlEnabled) {
                                toast.error("Clan War League is currently disabled");
                            }
                        }}
                        class="p-2"
                    >
                        <MdiSwordCross class="size-5 transition-transform" />
                        <span class="text-sm">Clan War League</span>
                    </CocButton>
                    {#if checks.isAdmin}
                        <CocButton href="/admin" class="p-2">
                            <MaterialSymbolsAdminPanelSettingsRounded class="size-5 transition-transform" />
                            <span class="text-sm">Admin Panel</span>
                        </CocButton>
                    {/if}
                </div>
            </Popover.Content>
        </Popover.Portal>
    </Popover.Root>
{:else}
    <CocButton href="/auth/login" size="sm">Login</CocButton>
{/if}
