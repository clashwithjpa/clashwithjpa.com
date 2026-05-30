<script lang="ts">
    import { PUBLIC_SERVER_URL } from "$env/static/public";
    import { authClient, hasPermission } from "$lib/auth";
    import Avatar from "$lib/components/ui/Avatar.svelte";
    import Badge from "$lib/components/ui/Badge.svelte";
    import Button from "$lib/components/ui/Button.svelte";
    import Icon from "$lib/components/ui/Icon.svelte";
    import RoleBadge from "$lib/components/ui/RoleBadge.svelte";
    import Seo from "$lib/components/ui/Seo.svelte";
    import Tooltip from "$lib/components/ui/Tooltip.svelte";

    import type { Role } from "$lib/config/roles";
    import { formatDate, formatDateTime } from "$lib/utils";
    import { cardSlideIn, fadeIn } from "$lib/utils/animations";
    import {
        getCOCPlayer,
        type GetCOCPlayer500,
        getJPAClans,
        getJPACwlClans,
        getUserAccounts,
        getUserCwlApplications,
    } from "@repo/clashofclans-client";
    import { toast } from "svelte-sonner";
    import SvgSpinnersBlocksScale from "~icons/svg-spinners/blocks-scale";
    import SvgSpinnersRingResize from "~icons/svg-spinners/ring-resize";
    import TablerBuildingCastle from "~icons/tabler/building-castle";
    import TablerCalendarClock from "~icons/tabler/calendar-clock";
    import TablerDownload from "~icons/tabler/download";
    import TablerExternalLink from "~icons/tabler/external-link";
    import TablerHammer from "~icons/tabler/hammer";
    import TablerListNumbers from "~icons/tabler/list-numbers";
    import TablerMapPin from "~icons/tabler/map-pin";
    import TablerScale from "~icons/tabler/scale";
    import TablerX from "~icons/tabler/x";

    const session = authClient.useSession();

    let importDismissed = $state(false);
    let isImporting = $state(false);

    async function importAccounts() {
        isImporting = true;
        try {
            const res = await fetch(`${PUBLIC_SERVER_URL}/user/accounts/import`, {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
            });
            const body = (await res.json()) as
                | { success: true; data: { imported: { cocAccountTag: string }[]; available: number } }
                | { success: false; error: string };

            if (!body.success) {
                toast.error(body.error || "Failed to import accounts");
                return;
            }

            const { imported, available } = body.data;
            if (available === 0) {
                toast.info("No pre-existing accounts found for your Discord ID. Please apply manually.");
                importDismissed = true;
            } else if (imported.length === 0) {
                toast.info("All your accounts are already linked.");
                importDismissed = true;
            } else {
                toast.success(`Imported ${imported.length} account${imported.length === 1 ? "" : "s"}.`);
                // Refresh to pick up new role + linked accounts.
                location.reload();
            }
        } catch (err) {
            console.error("Import error:", err);
            toast.error("Failed to import accounts");
        } finally {
            isImporting = false;
        }
    }
</script>

<Seo title="Dashboard" />

<div class="flex w-full items-center justify-start">
    <div class="flex items-center justify-start gap-4">
        <Avatar
            src={$session.data?.user.image}
            name={$session.data?.user.name || ""}
            role={($session.data?.user.role as Role) || "unverified"}
            size="2xl"
        />
        <div class="flex flex-col gap-2">
            <h1 class="text-4xl font-bold">{$session.data?.user.name?.split(" ")[0]}</h1>
            <div class="flex items-start justify-center gap-2">
                <RoleBadge role={$session.data?.user.role ?? "unverified"} />
                <div class="flex flex-wrap gap-1">
                    <Tooltip title="Joined {formatDateTime($session.data?.user.createdAt)}" placement="bottom">
                        <Badge variant="green" content={formatDate($session.data?.user.createdAt)} icon={TablerCalendarClock} />
                    </Tooltip>
                </div>
            </div>
        </div>
    </div>
</div>

<hr class="my-6 border-stone-700/50" />

{#snippet importBanner()}
    {#if !importDismissed}
        <div
            in:fadeIn
            class="mb-6 flex flex-col items-start justify-between gap-3 rounded-lg border-2 border-stone-700/50 bg-stone-900 p-4 md:flex-row md:items-center"
        >
            <div class="flex items-start gap-3">
                <TablerDownload class="mt-0.5 size-5 shrink-0 text-stone-300" />
                <div class="flex flex-col gap-1">
                    <span class="font-semibold text-stone-100">Import your existing accounts</span>
                    <span class="text-sm text-stone-400">
                        If you were previously a JPA member, we can link your Clash accounts automatically using your Discord ID.
                    </span>
                </div>
            </div>
            <div class="flex shrink-0 items-center gap-2 self-end md:self-center">
                <Button variant="ghost" size="sm" disabled={isImporting} onclick={() => (importDismissed = true)}>Dismiss</Button>
                <Button size="sm" disabled={isImporting} onclick={importAccounts}>
                    {#if isImporting}
                        <span class="flex items-center justify-center gap-2">
                            <SvgSpinnersRingResize class="size-4" /> Importing...
                        </span>
                    {:else}
                        Import accounts
                    {/if}
                </Button>
            </div>
        </div>
    {/if}
{/snippet}

{#if $session.data?.user.role === "unverified"}
    {@render importBanner()}
{/if}

{#if $session.data?.user.role !== "unverified"}
    {#await getUserAccounts({ baseURL: PUBLIC_SERVER_URL, credentials: "include" })}
        <div class="flex items-center justify-start gap-2 text-2xl font-bold text-stone-400">
            <SvgSpinnersBlocksScale />
            <span>Linked Accounts</span>
        </div>
    {:then resp}
        {#if resp.data.accounts.length === 0}
            {@render importBanner()}
        {/if}
        <div in:fadeIn>
            <h1 class="text-2xl font-bold">Linked Accounts</h1>
            <br />
            <div class="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
                {#if resp.data.accounts.length === 0}
                    <div class="flex items-center justify-start gap-1 text-stone-400">
                        <TablerX />
                        <span>No linked accounts found</span>
                    </div>
                {:else}
                    {#each resp.data.accounts as account}
                        <div
                            class="flex min-h-20 w-full items-center justify-center overflow-hidden rounded-lg border-2 border-stone-700/50 bg-stone-900 p-2"
                        >
                            {#await getCOCPlayer(encodeURIComponent(account.cocAccountTag), { baseURL: PUBLIC_SERVER_URL, credentials: "include" })}
                                <SvgSpinnersBlocksScale class="size-8 text-stone-400" />
                            {:then acc}
                                {#if !acc.success}
                                    <div in:fadeIn use:cardSlideIn class="flex size-full min-w-0 flex-col items-start justify-start gap-2">
                                        <TablerX class="size-16 text-stone-400" />
                                        <div class="flex flex-col items-start justify-center gap-1">
                                            <span class="text-lg font-semibold">Error fetching player</span>
                                            <span class="font-mono text-sm text-stone-400">{(acc as unknown as GetCOCPlayer500).error}</span>
                                        </div>
                                    </div>
                                {:else}
                                    <div in:fadeIn use:cardSlideIn class="flex size-full min-w-0 flex-col items-start justify-start gap-2">
                                        <div class="flex w-full min-w-0 flex-col items-start justify-center gap-2">
                                            <Tooltip title="Townhall {acc.data.player.townHallLevel}" placement="right">
                                                <Icon name="th/{acc.data.player.townHallLevel}" class="size-16 shrink-0" />
                                            </Tooltip>
                                            <div class="w-full min-w-0">
                                                <Tooltip title={acc.data.player.name} placement="top" class="w-full text-left">
                                                    <span class="block w-full truncate text-lg font-semibold">
                                                        {acc.data.player.name}
                                                    </span>
                                                </Tooltip>
                                                <span class="block w-full truncate font-mono text-sm text-stone-400">
                                                    {acc.data.player.tag}
                                                </span>
                                            </div>
                                        </div>
                                        <div class="flex shrink-0 flex-wrap gap-1">
                                            {#if account.isExternal}
                                                <Badge variant="red" content="External" icon={TablerExternalLink} />
                                            {/if}
                                            {#if acc.data.player.clan}
                                                <Badge
                                                    variant="blue"
                                                    content={acc.data.player.clan?.name}
                                                    icon={acc.data.player.clan?.badgeUrls.small}
                                                    iconSize="size-4"
                                                />
                                            {/if}
                                            <Badge variant="yellow" content="BH {acc.data.player.builderHallLevel}" icon={TablerHammer} />
                                        </div>
                                    </div>
                                {/if}
                            {/await}
                        </div>
                    {/each}
                {/if}
            </div>
        </div>
    {/await}
{/if}

<br />

{#await hasPermission($session.data?.user.id, "cwl") then canApplyCWL}
    {#if canApplyCWL}
        {#await Promise.all( [getUserCwlApplications( { baseURL: PUBLIC_SERVER_URL, credentials: "include" }, ), getJPAClans( { baseURL: PUBLIC_SERVER_URL, credentials: "include" }, ), getJPACwlClans( { baseURL: PUBLIC_SERVER_URL, credentials: "include" }, )], )}
            <div in:fadeIn class="flex items-center justify-start gap-2 text-2xl font-bold text-stone-400">
                <SvgSpinnersBlocksScale />
                <span>CWL Applications</span>
            </div>
        {:then [resp, jpaClansResp, jpaCwlClansResp]}
            <div in:fadeIn>
                <h1 class="text-2xl font-bold">CWL Applications</h1>
                <br />
                {#if resp.data.applications.length === 0}
                    <div class="flex items-center justify-start gap-1 text-stone-400">
                        <TablerX />
                        <span>No CWL applications found</span>
                    </div>
                {:else}
                    <div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {#each resp.data.applications as application}
                            <div
                                in:fadeIn
                                use:cardSlideIn
                                class="flex min-h-40 min-w-0 flex-col gap-4 rounded-lg border-2 border-stone-700/50 bg-stone-900 p-4"
                            >
                                <div class="flex items-start justify-between gap-4">
                                    <div class="flex min-w-0 flex-col items-start justify-center gap-1">
                                        <Tooltip title={application.cocAccountName} placement="top" class="w-full text-left">
                                            <span class="block w-full truncate text-xl font-bold text-stone-50">
                                                {application.cocAccountName}
                                            </span>
                                        </Tooltip>
                                        <span class="block w-full truncate font-mono text-xs text-stone-400">
                                            {application.cocAccountTag}
                                        </span>
                                    </div>
                                    <div class="flex shrink-0 flex-col items-end gap-1">
                                        <Tooltip title={formatDateTime(application.appliedAt)} placement="top">
                                            <span class="cursor-default text-sm text-stone-400">
                                                {formatDate(application.appliedAt)}
                                            </span>
                                        </Tooltip>
                                        {#if application.isExternal}
                                            <Badge variant="red" content="External" class="mt-2" icon={TablerExternalLink} />
                                        {/if}
                                    </div>
                                </div>

                                <hr class="border-stone-700/50" />

                                <div class="flex flex-col gap-2">
                                    {#if application.cocAccountClan}
                                        <div class="flex items-center justify-between gap-2 text-sm">
                                            <span class="flex items-center gap-1 font-medium text-stone-400">
                                                <TablerBuildingCastle class="size-4" />
                                                Clan
                                            </span>
                                            <span class="text-stone-200">{jpaClansResp.data.clans[application.cocAccountClan]?.clanName}</span>
                                        </div>
                                    {/if}
                                    <div class="flex items-center justify-between gap-2 text-sm">
                                        <span class="flex items-center gap-1 font-medium text-stone-400">
                                            <TablerListNumbers class="size-4" />
                                            Pref. Number
                                        </span>
                                        <span class="font-mono text-stone-200">{application.preferenceNum.toString()}</span>
                                    </div>
                                    <div class="flex items-center justify-between gap-2 text-sm">
                                        <span class="flex items-center gap-1 font-medium text-stone-400">
                                            <TablerScale class="size-4" />
                                            Weight
                                        </span>
                                        <span class="font-mono text-stone-200">{application.cocAccountWeight.toLocaleString()}</span>
                                    </div>
                                </div>

                                <div class="flex flex-col items-start justify-between gap-2">
                                    <span class="flex items-center gap-1 font-medium text-stone-400">
                                        <TablerMapPin class="size-4" />
                                        Assigned Clan
                                    </span>
                                    <Button
                                        href="https://link.clashofclans.com/en/?action=OpenClanProfile&tag={encodeURIComponent(
                                            application.assignedTo || '',
                                        )}"
                                        target="_blank"
                                        class="w-full gap-2"
                                        variant={application.assignedTo ? "success" : "base"}
                                        disabled={!application.assignedTo}
                                    >
                                        {#if application.assignedTo}
                                            {jpaCwlClansResp.data.clans[application.assignedTo]?.clanName || "View Assigned Clan"}
                                            <TablerExternalLink class="size-5" />
                                        {:else}
                                            Clan Not Assigned
                                        {/if}
                                    </Button>
                                </div>
                            </div>
                        {/each}
                    </div>
                {/if}
            </div>
        {/await}
    {/if}
{/await}
