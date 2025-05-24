<script lang="ts">
    import { invalidateAll } from "$app/navigation";
    import AdminItem from "$lib/components/admin/Item.svelte";
    import { Button } from "$lib/components/admin/ui/button";
    import { toast } from "svelte-sonner";
    import { Switch } from "bits-ui";
    import type { APIGuild, APIRole, APIUser } from "discord-api-types/v10";
    import MaterialSymbolsRefreshRounded from "~icons/material-symbols/refresh-rounded";
    import MaterialSymbolsSendRounded from "~icons/material-symbols/send-rounded";
    import type { PageData } from "./$types";

    let { data }: { data: PageData } = $props();
    let applicationEnabled: boolean = $state(data.applicationEnabled);
    let cwlEnabled: boolean = $state(data.cwlEnabled);
    let guildID: string = $state(data.adminConfig.guildId);
    let adminRoleID: string = $state("");
    let adminRoles: APIRole[] = $state(data.adminRoles);
    let adminID: string = $state("");
    let admins: APIUser[] = $state(data.admins);

    $effect(() => {
        applicationEnabled = data.applicationEnabled;
        cwlEnabled = data.cwlEnabled;
        guildID = data.adminConfig.guildId;
        adminRoles = data.adminRoles;
        admins = data.admins;
    });

    let disabled: {
        applicationStatus: boolean;
        cwlStatus: boolean;
        syncClan: boolean;
        guildID: {
            input: boolean;
            button: boolean;
        };
    } = $state({
        applicationStatus: false,
        cwlStatus: false,
        syncClan: false,
        guildID: {
            input: false,
            button: true
        }
    });
    let syncSpin: boolean = $state(false);

    $effect(() => {
        if (guildID == data.adminConfig.guildId) {
            disabled.guildID.button = true;
        } else {
            disabled.guildID.button = false;
        }
    });

    async function changeAppStatus() {
        disabled.applicationStatus = true;
        const body = {
            key: "applications_enabled",
            value: applicationEnabled
        };
        let response = await fetch("/api/settings", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body)
        });

        if (response.ok) {
            toast.success(`Applications are now ${applicationEnabled ? "enabled" : "disabled"}`);
            invalidateAll();
        } else {
            toast.error("Failed to set application status");
        }
        setTimeout(() => {
            disabled.applicationStatus = false;
        }, 2000);
    }

    async function changeCWLStatus() {
        disabled.cwlStatus = true;
        const body = {
            key: "cwl_enabled",
            value: cwlEnabled
        };
        let response = await fetch("/api/settings", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body)
        });

        if (response.ok) {
            toast.success(`CWL is now ${cwlEnabled ? "enabled" : "disabled"}`);
            invalidateAll();
        } else {
            toast.error("Failed to set CWL status");
        }
        setTimeout(() => {
            disabled.cwlStatus = false;
        }, 2000);
    }

    async function syncClans() {
        disabled.syncClan = true;
        syncSpin = true;
        let resp = await fetch("/api/clans", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ key: "sync_clans" })
        });
        if (resp.ok) {
            toast.success("Clans have been synced");
        } else {
            const data = await resp.json();
            toast.error(data.error);
        }
        syncSpin = false;
        setTimeout(() => {
            disabled.syncClan = false;
        }, 5000);
    }

    async function setGuildID() {
        disabled.guildID.input = true;
        disabled.guildID.button = true;
        const body = {
            key: "guild_id",
            value: { id: guildID.toString() }
        };
        let resp = await fetch("/api/settings", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body)
        });

        if (resp.ok) {
            const respData: APIGuild = await resp.json();
            toast.success(`Guild is set to ${respData.name}`);
            invalidateAll();
        } else {
            toast.error("Invalid Guild ID");
        }
        setTimeout(() => {
            disabled.guildID.input = false;
            disabled.guildID.button = false;
        }, 2000);
    }

    async function setAdminRole() {
        const body = {
            key: "add_admin_role_id",
            value: adminRoleID.toString()
        };
        let resp = await fetch("/api/settings", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body)
        });

        if (resp.ok) {
            const respData: APIRole = await resp.json();
            toast.success(`Added role ${respData.name}`);
            invalidateAll();
        } else {
            toast.error("Invalid Role ID");
        }
        adminRoleID = "";
    }
    async function removeAdminRole(roleID: string) {
        const body = {
            key: "remove_admin_role_id",
            value: roleID
        };
        let resp = await fetch("/api/settings", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body)
        });

        if (resp.ok) {
            toast.success(`Removed role ${adminRoles.find((r) => r.id == roleID)?.name}`);
            invalidateAll();
        } else {
            toast.error("Failed to remove role");
        }
    }

    async function setAdmin() {
        const body = {
            key: "add_admin_id",
            value: adminID.toString()
        };
        let resp = await fetch("/api/settings", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body)
        });

        if (resp.ok) {
            const respData: APIUser = await resp.json();
            toast.success(`Added admin ${respData.username}`);
            invalidateAll();
        } else {
            toast.error("Invalid User ID");
        }
        adminID = "";
    }
    async function removeAdmin(adminID: string) {
        const body = {
            key: "remove_admin_id",
            value: adminID
        };
        let resp = await fetch("/api/settings", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body)
        });

        if (resp.ok) {
            toast.success(`Removed admin ${admins.find((a) => a.id == adminID)?.username}`);
            invalidateAll();
        } else {
            toast.error("Failed to remove admin");
        }
    }
</script>

<div class="flex size-full items-start justify-center overflow-auto p-5 md:p-11">
    <div class="3xl:w-4/5 flex flex-col items-start justify-center gap-5 md:gap-28 lg:flex-row">
        <div class="flex flex-col items-start justify-center gap-5">
            <!-- Application Status -->
            <div class="flex items-center gap-2">
                <span>Application Status</span>
                <Switch.Root
                    name="applicationStatus"
                    bind:checked={applicationEnabled}
                    disabled={disabled.applicationStatus}
                    onCheckedChange={changeAppStatus}
                    class="inline-flex h-8 w-[60px] cursor-pointer items-center gap-11 rounded-full bg-gray-800 p-1 transition-all disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-green-600"
                >
                    <Switch.Thumb
                        class="pointer-events-none block size-7 shrink-0 rounded-full bg-gray-50 transition-all data-[state=checked]:translate-x-[90%] data-[state=unchecked]:translate-x-0"
                    />
                </Switch.Root>
            </div>
            <!-- CWL Status -->
            <div class="flex items-center gap-2">
                <span>CWL Status</span>
                <Switch.Root
                    name="CWLStatus"
                    bind:checked={cwlEnabled}
                    disabled={disabled.cwlStatus}
                    onCheckedChange={changeCWLStatus}
                    class="inline-flex h-8 w-[60px] cursor-pointer items-center gap-11 rounded-full bg-gray-800 p-1 transition-all disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-green-600"
                >
                    <Switch.Thumb
                        class="pointer-events-none block size-7 shrink-0 rounded-full bg-gray-50 transition-all data-[state=checked]:translate-x-[90%] data-[state=unchecked]:translate-x-0"
                    />
                </Switch.Root>
            </div>
            <!-- Sync Clan Data -->
            <div class="flex items-center gap-2">
                <span>Sync Clan Data</span>
                <Button class="p-1" onclick={syncClans} disabled={disabled.syncClan}>
                    <MaterialSymbolsRefreshRounded class="size-6 {syncSpin ? 'animate-spin' : ''}" />
                </Button>
            </div>
            <!-- Guild ID -->
            <div class="flex flex-col items-start gap-2">
                <span>Guild ID</span>
                <div class="flex items-center gap-2">
                    <input placeholder="Enter Guild ID" maxlength="19" bind:value={guildID} disabled={disabled.guildID.input} />
                    <Button class="p-2" onclick={setGuildID} disabled={disabled.guildID.button}>
                        <MaterialSymbolsSendRounded class="size-6" />
                    </Button>
                </div>
            </div>
        </div>
        <div class="flex flex-col items-start justify-center gap-5">
            <!-- Admin Roles -->
            <AdminItem
                title="Admin Roles"
                placeholder="Enter Role ID"
                bind:inputValue={adminRoleID}
                onSubmit={setAdminRole}
                items={adminRoles}
                removeItem={removeAdminRole}
            />
            <!-- Admins -->
            <AdminItem
                title="Admins"
                placeholder="Enter User ID"
                bind:inputValue={adminID}
                onSubmit={setAdmin}
                items={admins}
                removeItem={removeAdmin}
            />
        </div>
    </div>
</div>
