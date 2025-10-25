<script lang="ts">
    import { invalidateAll } from "$app/navigation";
    import Item from "$lib/components/admin/Item.svelte";
    import { Button } from "$lib/components/ui/button";
    import { Input } from "$lib/components/ui/input";
    import { Separator } from "$lib/components/ui/separator";
    import { Switch } from "$lib/components/ui/switch";
    import type { APIGuild, APIRole, APIUser } from "discord-api-types/v10";
    import { toast } from "svelte-sonner";
    import LucideSend from "~icons/lucide/send";
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
        guildID: {
            input: boolean;
            button: boolean;
        };
    } = $state({
        applicationStatus: false,
        cwlStatus: false,
        guildID: {
            input: false,
            button: true
        }
    });

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

<div class="flex w-full items-center justify-between gap-6">
    <div>
        <h2 class="text-2xl font-bold">Application Status</h2>
        <p class="text-muted-foreground text-sm">Toggle the application status to enable or disable applications.</p>
    </div>
    <Switch name="applicationStatus" bind:checked={applicationEnabled} disabled={disabled.applicationStatus} onCheckedChange={changeAppStatus} />
</div>

<Separator class="my-6" />

<div class="flex w-full items-center justify-between gap-6">
    <div>
        <h2 class="text-2xl font-bold">CWL Status</h2>
        <p class="text-muted-foreground text-sm">Toggle the Clan War League status to enable or disable CWL features.</p>
    </div>
    <Switch name="cwlStatus" bind:checked={cwlEnabled} disabled={disabled.cwlStatus} onCheckedChange={changeCWLStatus} />
</div>

<Separator class="my-6" />

<div class="flex w-full flex-col justify-between gap-6 md:flex-row md:items-center">
    <div>
        <h2 class="text-2xl font-bold">Guild ID</h2>
        <p class="text-muted-foreground text-sm">Set the Guild ID for the app. This is required for the app to function properly.</p>
    </div>
    <div class="flex items-center justify-center gap-2">
        <Input placeholder="Enter Guild ID" bind:value={guildID} disabled={disabled.guildID.input} />
        <Button size="icon" onclick={setGuildID} disabled={disabled.guildID.button}>
            <LucideSend />
        </Button>
    </div>
</div>

<Separator class="my-6" />

<Item
    title="Admin Roles"
    description="Add or remove roles that have admin privileges for the whole app."
    placeholder="Enter Role ID"
    bind:inputValue={adminRoleID}
    onSubmit={setAdminRole}
    items={adminRoles}
    removeItem={removeAdminRole}
/>

<Separator class="my-6" />

<Item
    title="Admins"
    description="Add or remove users that have admin privileges for the whole app."
    placeholder="Enter User ID"
    bind:inputValue={adminID}
    onSubmit={setAdmin}
    items={admins}
    removeItem={removeAdmin}
/>
