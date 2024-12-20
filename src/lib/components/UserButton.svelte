<script lang="ts">
    import Button from "$lib/components/Button.svelte";
    import { Popover } from "bits-ui";
    import { fade } from "svelte/transition";
    import MaterialSymbolsLogoutRounded from "~icons/material-symbols/logout-rounded";
    import MaterialSymbolsLabProfileRounded from "~icons/material-symbols/lab-profile-rounded";
    import MdiSwordCross from "~icons/mdi/sword-cross";
    import { toast } from "$lib/components/toast";
    import { invalidateAll } from "$app/navigation";
    import type { UserData } from "$lib/auth/user";

    let { user }: { user: UserData | null } = $props();

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
        <Popover.Trigger>
            <img src="https://media.discordapp.net/avatars/{user.id}/{user.avatar}.webp" alt="Avatar" class="size-8 rounded-full lg:size-11" />
        </Popover.Trigger>
        <Popover.Content transition={fade} transitionConfig={{ duration: 100 }} class="z-20 max-w-80 rounded-lg p-2">
            <div
                class="from- flex flex-col gap-5 rounded-lg border border-gray-950 bg-gradient-to-b from-gray-800 to-gray-900 p-5 shadow-[0_0_5px_0.5px_var(--tw-shadow-color)] shadow-gray-950 backdrop-blur-md"
            >
                <div class="flex gap-x-5">
                    <Button onclick={logout} class="p-2" type="danger">
                        <MaterialSymbolsLogoutRounded class="size-5 rotate-180 transition-transform" />
                        <span class="text-xs">Logout</span>
                    </Button>
                    <Button href="/apply" class="p-2">
                        <MaterialSymbolsLabProfileRounded class="size-5 transition-transform" />
                        <span class="text-xs">Apply</span>
                    </Button>
                </div>
                <Button href="/cwl" class="p-2">
                    <MdiSwordCross class="size-5 transition-transform" />
                    <span class="text-xs">Clan War League</span>
                </Button>
            </div>
        </Popover.Content>
    </Popover.Root>
{:else}
    <Button href="/auth/login" size="sm">Login</Button>
{/if}
