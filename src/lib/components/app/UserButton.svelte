<script lang="ts">
    import { invalidateAll } from "$app/navigation";
    import type { UserData } from "$lib/auth/user";
    import type { APIPlayer } from "$lib/coc/types";
    import CocButton from "$lib/components/app/CocButton.svelte";
    import { toast } from "$lib/components/app/toast";
    import type { InsertCoc, InsertUser } from "$lib/server/schema";
    import { Popover, Tooltip } from "bits-ui";
    import MaterialSymbolsAdminPanelSettingsRounded from "~icons/material-symbols/admin-panel-settings-rounded";
    import MaterialSymbolsCrownRounded from "~icons/material-symbols/crown-rounded";
    import MaterialSymbolsLabProfileRounded from "~icons/material-symbols/lab-profile-rounded";
    import MaterialSymbolsLogoutRounded from "~icons/material-symbols/logout-rounded";
    import MaterialSymbolsManageAccountsRounded from "~icons/material-symbols/manage-accounts-rounded";
    import MdiSwordCross from "~icons/mdi/sword-cross";
    import P from "./ui/P.svelte";
    import PopupDialog from "./ui/PopupDialog.svelte";

    let {
        user,
        applicationEnabled,
        cwlEnabled,
        cocAccs
    }: { user: UserData | null; applicationEnabled: boolean; cwlEnabled: boolean; cocAccs: (InsertUser & { cocAccounts: InsertCoc[] }) | undefined } =
        $props();

    async function logout() {
        try {
            await fetch("/auth/logout");
            toast.success("Logged out successfully");
            invalidateAll();
        } catch {
            toast.error("Failed to logout");
        }
    }

    let openPopup: boolean = $state(false);
    const cardGradient: string = "from-sky-500 via-sky-600 to-sky-900";

    async function fetchCocAccounts(tag: string): Promise<APIPlayer> {
        return fetch(`/api/player?tag=${encodeURIComponent(tag)}`)
            .then((res) => res.json())
            .then((data) => data as APIPlayer);
    }
</script>

<PopupDialog bind:open={openPopup} title="Linked COC Accounts" style="coc">
    <div class="flex max-h-[calc(100vh-400px)] w-full flex-wrap items-center justify-center gap-2 overflow-scroll">
        {#if cocAccs}
            {#each cocAccs.cocAccounts as account}
                {#await fetchCocAccounts(account.tag)}
                    <div
                        class="flex items-center justify-center rounded-xl border-2 border-gray-950 bg-linear-to-b p-2 {cardGradient} shadow-[0_0_5px_0.5px_var(--tw-shadow-color)] inset-shadow-sm shadow-gray-950"
                    >
                        <div class="flex items-center justify-center gap-2">
                            <div class="size-15 shrink-0 animate-pulse rounded-lg bg-gray-800"></div>
                            <div class="flex flex-col items-start justify-center gap-1">
                                <div class="h-4 w-20 animate-pulse rounded bg-gray-800"></div>
                                <div class="h-3 w-16 animate-pulse rounded bg-gray-800"></div>
                            </div>
                        </div>
                    </div>
                {:then acc}
                    <div
                        class="flex w-45 items-center justify-center rounded-xl border-2 border-gray-950 bg-linear-to-b p-2 {cardGradient} shadow-[0_0_5px_0.5px_var(--tw-shadow-color)] inset-shadow-sm shadow-gray-950"
                    >
                        <img src="/townhall/{acc.townHallLevel}.webp" alt="TH {acc.townHallLevel}" class="size-15 shrink-0 rounded-lg" />
                        <div class="flex flex-col items-start justify-center">
                            <Tooltip.Provider>
                                <Tooltip.Root delayDuration={200}>
                                    <Tooltip.Trigger class="cursor-default">
                                        <P>
                                            {acc.name.length >= 6 ? `${acc.name.slice(0, 6).trim()}...` : acc.name}
                                        </P>
                                    </Tooltip.Trigger>
                                    <Tooltip.Content
                                        class="rounded-lg border border-gray-700 bg-linear-to-r from-gray-900 via-gray-800 to-gray-900 p-2 text-sm"
                                    >
                                        <p>{acc.name}</p>
                                    </Tooltip.Content>
                                </Tooltip.Root>
                            </Tooltip.Provider>
                            <span class="text-xs">{acc.tag}</span>
                        </div>
                    </div>
                {/await}
            {/each}
        {/if}
    </div>
</PopupDialog>

{#if user}
    <Popover.Root>
        <Popover.Trigger class="cursor-pointer">
            {#if user.isAdmin}
                <MaterialSymbolsCrownRounded class="-mb-2 size-6 -rotate-[15deg] text-yellow-400" />
            {/if}
            <img src="https://media.discordapp.net/avatars/{user.id}/{user.avatar}" alt="Avatar" class="size-8 rounded-full lg:size-11" />
        </Popover.Trigger>
        <Popover.Portal>
            <Popover.Content class="max-w-80 rounded-xl p-2">
                <div
                    class="flex flex-col gap-5 rounded-xl border border-gray-950 bg-linear-to-b from-gray-800 via-gray-800 to-gray-900 p-5 shadow-[0_0_5px_0.5px_var(--tw-shadow-color)] shadow-gray-950"
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
                    {#if cocAccs}
                        <CocButton class="p-2" onclick={() => (openPopup = !openPopup)}>
                            <MaterialSymbolsManageAccountsRounded class="size-5 transition-transform" />
                            <span class="text-sm">COC Accounts</span>
                        </CocButton>
                    {/if}
                    {#if user.isAdmin}
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
