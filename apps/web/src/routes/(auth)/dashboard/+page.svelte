<script lang="ts">
    import { PUBLIC_SERVER_URL } from "$env/static/public";
    import { authClient, hasPermission } from "$lib/auth";
    import Avatar from "$lib/components/ui/Avatar.svelte";
    import Badge from "$lib/components/ui/Badge.svelte";
    import Button from "$lib/components/ui/Button.svelte";
    import Icon from "$lib/components/ui/Icon.svelte";
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
    import type { Component } from "svelte";
    import SvgSpinnersBlocksScale from "~icons/svg-spinners/blocks-scale";
    import TablerBuildingCastle from "~icons/tabler/building-castle";
    import TablerCalendarClock from "~icons/tabler/calendar-clock";
    import TablerCrown from "~icons/tabler/crown";
    import TablerFileText from "~icons/tabler/file-text";
    import TablerHammer from "~icons/tabler/hammer";
    import TablerListNumbers from "~icons/tabler/list-numbers";
    import TablerMapPin from "~icons/tabler/map-pin";
    import TablerQuestionMark from "~icons/tabler/question-mark";
    import TablerRosetteDiscountCheck from "~icons/tabler/rosette-discount-check";
    import TablerScale from "~icons/tabler/scale";
    import TablerTool from "~icons/tabler/tool";
    import TablerUsersPlus from "~icons/tabler/users-plus";
    import TablerX from "~icons/tabler/x";

    const session = authClient.useSession();

    const roleIcons: Record<Role, Component> = {
        unverified: TablerQuestionMark,
        verified: TablerRosetteDiscountCheck,
        manager: TablerTool,
        reviewer: TablerFileText,
        admin: TablerCrown,
    };
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
                <Badge
                    variant="ghost"
                    content={$session.data?.user.role ?? "unverified"}
                    icon={roleIcons[($session.data?.user.role as Role) ?? "unverified"]}
                />
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

{#if $session.data?.user.role !== "unverified"}
    {#await getUserAccounts({ baseURL: PUBLIC_SERVER_URL, credentials: "include" })}
        <div class="flex items-center justify-start gap-2 text-2xl font-bold text-stone-400">
            <SvgSpinnersBlocksScale />
            <span>Linked Accounts</span>
        </div>
    {:then resp}
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
                                        {#if application.isAlt}
                                            <Badge variant="yellow" content="Alt" class="mt-2" icon={TablerUsersPlus} />
                                        {/if}
                                    </div>
                                </div>

                                <hr class="border-stone-700/50" />

                                <div class="flex flex-col gap-2">
                                    <div class="flex items-center justify-between gap-2 text-sm">
                                        <span class="flex items-center gap-1 font-medium text-stone-400">
                                            <TablerBuildingCastle class="size-4" />
                                            Clan
                                        </span>
                                        <span class="text-stone-200">{jpaClansResp.data.clans[application.cocAccountClan]?.clanName}</span>
                                    </div>
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
                                        class="w-full"
                                        variant={application.assignedTo ? "success" : "base"}
                                        disabled={!application.assignedTo}
                                    >
                                        {#if application.assignedTo}
                                            {jpaCwlClansResp.data.clans[application.assignedTo]?.clanName || "View Assigned Clan"}
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
