<script lang="ts">
    import { invalidateAll } from "$app/navigation";
    import type { APIPlayer } from "$lib/coc/types";
    import type { SelectClanApplication } from "$lib/server/schema";
    import { Tooltip } from "bits-ui";
    import { expoIn, expoOut } from "svelte/easing";
    import { fade, fly, slide } from "svelte/transition";
    import HugeiconsMoneyReceiveCircle from "~icons/hugeicons/money-receive-circle";
    import HugeiconsMoneySendCircle from "~icons/hugeicons/money-send-circle";
    import LineMdChevronSmallDown from "~icons/line-md/chevron-small-down";
    import LineMdChevronSmallRight from "~icons/line-md/chevron-small-right";
    import LogosDiscordIcon from "~icons/logos/discord-icon";
    import MaterialSymbolsCheckRounded from "~icons/material-symbols/check-rounded";
    import MaterialSymbolsCloseRounded from "~icons/material-symbols/close-rounded";
    import MaterialSymbolsDeleteRounded from "~icons/material-symbols/delete-rounded";
    import CocButton from "$lib/components/app/CocButton.svelte";
    import { toast } from "$lib/components/app/toast";
    import UserName from "./UserName.svelte";

    interface Props {
        applications: SelectClanApplication[];
        type: "pending" | "accepted" | "rejected";
    }
    let { applications, type }: Props = $props();

    function sortApps() {
        const sortedApps = Object.entries(
            applications.reduce((acc: { [key: string]: typeof applications }, app) => {
                if (app.status === type) {
                    const date = new Date(app.createdAt).toLocaleString("en-IN", { month: "long", day: "numeric", year: "numeric" });
                    if (!acc[date]) acc[date] = [];
                    acc[date].push(app);
                }
                return acc;
            }, {})
        );
        sortedApps.sort((a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime());
        return sortedApps;
    }

    let sortedApps = $state(sortApps());
    $effect(() => {
        sortedApps = sortApps();
    });

    let hidden: boolean[] = $state(
        Array(applications.filter((app) => app.status === type).length)
            .fill(false)
            .map((_, i) => (i === 0 ? false : true))
    );
    let hiddenInfo: boolean[] = $state(Array(applications.filter((app) => app.status === type).length).fill(true));
    let disabled: boolean = $state(false);

    async function fetchPlayerInfo(tag: string): Promise<APIPlayer | null> {
        const resp = await fetch(`/api/player?tag=${encodeURIComponent(tag)}`);
        if (resp.ok) {
            const plInfo: APIPlayer = await resp.json();
            return plInfo;
        } else {
            throw new Error("Failed to fetch player info");
        }
    }

    async function handleApplication(tag: string, name: string, status: "accepted" | "rejected" | "deleted", discordId: string = "") {
        disabled = true;
        const body: { status: typeof status; discordId?: string } = { status: status };
        if (status === "accepted" || status === "deleted") body["discordId"] = discordId;
        let response = await fetch(`/api/applications/${encodeURIComponent(tag)}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body)
        });

        if (response.ok) {
            toast.success(`${status.charAt(0).toUpperCase() + status.slice(1)} application of ${name}`);
            invalidateAll();
        } else {
            toast.error(`Failed change application status of ${name}`);
        }
        setTimeout(() => {
            disabled = false;
        }, 500);
    }
</script>

<ul class="mt-5 flex flex-col gap-5">
    {#if sortedApps.length === 0}
        <p class="text-gray-500">No {type} applications found</p>
    {:else}
        {#each sortedApps as [date, apps], idx}
            {#if apps.length > 0}
                <li class="flex w-full flex-col items-start justify-center">
                    <button class="flex w-full items-center text-gray-500" onclick={() => (hidden[idx] = !hidden[idx])}>
                        {#if hidden[idx]}
                            <span>
                                <LineMdChevronSmallRight class="size-fit" />
                            </span>
                        {:else}
                            <span>
                                <LineMdChevronSmallDown class="size-fit" />
                            </span>
                        {/if}
                        {date}
                        <span class="mx-2 grow rounded-xl border-t border-gray-500"></span>
                        {apps.length}
                        {apps.length > 1 ? "Applications" : "Application"}
                    </button>
                    {#if !hidden[idx]}
                        <ul transition:slide class="mt-2 flex w-full flex-wrap items-start justify-center gap-2 md:justify-start">
                            {#each apps as application, appIdx}
                                <div
                                    in:fly={{ duration: 500, easing: expoIn, x: -100, y: 0 }}
                                    out:fly={{ duration: 500, easing: expoOut, x: 100, y: 0 }}
                                    class="flex w-fit flex-col items-center justify-center gap-5 rounded-xl border border-gray-700 bg-linear-to-r from-gray-900 via-gray-800 to-gray-900 p-4"
                                >
                                    <div class="flex w-full items-center justify-between gap-5">
                                        <div class="flex items-center justify-center gap-1">
                                            <Tooltip.Provider>
                                                <Tooltip.Root delayDuration={200}>
                                                    <Tooltip.Trigger>
                                                        <img
                                                            src="/townhall/{application.playerData.townHallLevel}.webp"
                                                            alt="TH {application.playerData.townHallLevel}"
                                                            class="size-15 rounded-lg"
                                                        />
                                                    </Tooltip.Trigger>
                                                    <Tooltip.Content
                                                        class="rounded-lg border border-gray-700 bg-linear-to-r from-gray-900 via-gray-800 to-gray-900 p-2 text-sm"
                                                    >
                                                        <p>Townhall {application.playerData.townHallLevel}</p>
                                                    </Tooltip.Content>
                                                </Tooltip.Root>
                                            </Tooltip.Provider>
                                            <span class="flex flex-col items-start justify-center">
                                                <Tooltip.Provider>
                                                    <Tooltip.Root delayDuration={200}>
                                                        <Tooltip.Trigger class="cursor-default">
                                                            <p>
                                                                {application.playerData.name.length >= 6
                                                                    ? `${application.playerData.name.slice(0, 6).trim()}...`
                                                                    : application.playerData.name}
                                                            </p>
                                                        </Tooltip.Trigger>
                                                        <Tooltip.Content
                                                            class="rounded-lg border border-gray-700 bg-linear-to-r from-gray-900 via-gray-800 to-gray-900 p-2 text-sm"
                                                        >
                                                            <p>{application.playerData.name}</p>
                                                        </Tooltip.Content>
                                                    </Tooltip.Root>
                                                </Tooltip.Provider>
                                                <p class="text-xs">{application.tag}</p>
                                            </span>
                                        </div>
                                        <p class="text-gray-400">
                                            {new Date(application.createdAt).toLocaleTimeString("en-IN", {
                                                hour: "numeric",
                                                minute: "numeric"
                                            })}
                                        </p>
                                    </div>
                                    <div class="flex w-full flex-col items-center justify-center text-sm text-gray-400">
                                        <button
                                            onclick={() => (hiddenInfo[appIdx + idx] = !hiddenInfo[appIdx + idx])}
                                            class="flex w-full items-center justify-center gap-1"
                                        >
                                            <span class="grow rounded-xl border-t border-gray-400"></span>
                                            {#if hiddenInfo[appIdx + idx]}
                                                <span>
                                                    <LineMdChevronSmallRight class="size-fit" />
                                                </span>
                                            {:else}
                                                <span>
                                                    <LineMdChevronSmallDown class="size-fit" />
                                                </span>
                                            {/if}
                                            Player Data
                                            <span class="grow rounded-xl border-t border-gray-400"></span>
                                        </button>
                                        {#if !hiddenInfo[appIdx + idx]}
                                            {#await fetchPlayerInfo(application.tag)}
                                                <div in:slide class="flex w-full flex-col items-start justify-center gap-1">
                                                    {#each new Array(5) as _}
                                                        <div class="flex w-full animate-pulse items-center justify-start gap-1">
                                                            <div class="size-6 shrink-0 rounded-lg bg-gray-500"></div>
                                                            <div class="h-4 w-2/3 rounded-md bg-gray-500"></div>
                                                        </div>
                                                    {/each}
                                                    <div class="flex w-full items-center justify-center gap-1">
                                                        <span class="grow rounded-xl border-t border-gray-400"></span>
                                                        Donations
                                                        <span class="grow rounded-xl border-t border-gray-400"></span>
                                                    </div>
                                                    {#each new Array(3) as _}
                                                        <div class="flex w-full animate-pulse items-center justify-start gap-1">
                                                            <div class="size-6 shrink-0 rounded-lg bg-gray-500"></div>
                                                            <div class="h-4 w-2/3 rounded-md bg-gray-500"></div>
                                                        </div>
                                                    {/each}
                                                    <div class="flex w-full items-center justify-center gap-1">
                                                        <span class="grow rounded-xl border-t border-gray-400"></span>
                                                        Achievements
                                                        <span class="grow rounded-xl border-t border-gray-400"></span>
                                                    </div>
                                                    {#each new Array(5) as _}
                                                        <div class="flex w-full animate-pulse items-center justify-start gap-1">
                                                            <div class="size-6 shrink-0 rounded-lg bg-gray-500"></div>
                                                            <div class="h-4 w-2/3 rounded-md bg-gray-500"></div>
                                                        </div>
                                                    {/each}
                                                </div>
                                            {:then playerInfo}
                                                <div transition:fade class="flex w-full flex-col items-start justify-center gap-1">
                                                    <div class="flex w-full items-center justify-start gap-1">
                                                        <img src="/emoji/trophy.webp" alt="Donations" class="w-5.5 shrink-0" />
                                                        <p class="text-gray-300">
                                                            Trophies: {playerInfo?.trophies}
                                                        </p>
                                                    </div>
                                                    <div class="flex w-full items-center justify-start gap-1">
                                                        <img src="/emoji/attack.webp" alt="Donations" class="w-5.5 shrink-0" />
                                                        <p class="text-gray-300">
                                                            Attack Wins: {playerInfo?.attackWins}
                                                        </p>
                                                    </div>
                                                    <div class="flex w-full items-center justify-start gap-1">
                                                        <img src="/emoji/defence.webp" alt="Donations" class="w-5.5 shrink-0" />
                                                        <p class="text-gray-300">
                                                            Defence Wins: {playerInfo?.defenseWins}
                                                        </p>
                                                    </div>
                                                    <div class="flex w-full items-center justify-start gap-1">
                                                        <LogosDiscordIcon class="text-blurple size-6 shrink-0" />
                                                        <p class="text-gray-300">Discord:</p>
                                                        <UserName userID={application.discordId} />
                                                    </div>
                                                    <div class="flex w-full items-center justify-start gap-1">
                                                        <img src="/emoji/info.webp" alt="CG Donated" class="w-6 shrink-0" />
                                                        <p class="text-gray-300">
                                                            More Info: <a
                                                                href="https://cc.fwafarm.com/cc_n/member.php?tag={encodeURIComponent(
                                                                    application.tag
                                                                )}"
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                class="text-blue-400 hover:underline">Click here</a
                                                            >
                                                        </p>
                                                    </div>
                                                    <div class="flex w-full items-center justify-center gap-1">
                                                        <span class="grow rounded-xl border-t border-gray-400"></span>
                                                        Donations
                                                        <span class="grow rounded-xl border-t border-gray-400"></span>
                                                    </div>
                                                    <div class="flex w-full items-center justify-start gap-1">
                                                        <HugeiconsMoneySendCircle class="size-6 shrink-0 text-yellow-400" />
                                                        <p class="text-gray-300">
                                                            Donated: {playerInfo?.donations}
                                                        </p>
                                                    </div>
                                                    <div class="flex w-full items-center justify-start gap-1">
                                                        <HugeiconsMoneyReceiveCircle class="size-6 shrink-0 text-yellow-400" />
                                                        <p class="text-gray-300">
                                                            Received: {playerInfo?.donationsReceived}
                                                        </p>
                                                    </div>
                                                    <div class="flex w-full items-center justify-center gap-1">
                                                        <span class="grow rounded-xl border-t border-gray-400"></span>
                                                        Achievements
                                                        <span class="grow rounded-xl border-t border-gray-400"></span>
                                                    </div>
                                                    <div class="flex w-full items-center justify-start gap-1">
                                                        <img src="/emoji/donations.webp" alt="Total Donations" class="w-6 shrink-0" />
                                                        <p class="text-gray-300">
                                                            Total Donations: {playerInfo?.achievements.find((ach) => ach.name === "Friend in Need")
                                                                ?.value}
                                                        </p>
                                                    </div>
                                                    <div class="flex w-full items-center justify-start gap-1">
                                                        <img src="/emoji/trophy2.webp" alt="Donations" class="w-5.5 shrink-0" />
                                                        <p class="text-gray-300">
                                                            Best Trophies: {playerInfo?.bestTrophies}
                                                        </p>
                                                    </div>
                                                    <div class="flex w-full items-center justify-start gap-1">
                                                        <img src="/emoji/clangames.webp" alt="CG" class="w-6 shrink-0" />
                                                        <p class="text-gray-300">
                                                            Clan Games: {playerInfo?.achievements.find((ach) => ach.name === "Games Champion")?.value}
                                                        </p>
                                                    </div>
                                                    <div class="flex w-full items-center justify-start gap-1">
                                                        <img src="/emoji/cg_raid.webp" alt="CG Raided" class="w-6 shrink-0" />
                                                        <p class="text-gray-300">
                                                            CG Raided: {playerInfo?.achievements.find((ach) => ach.name === "Aggressive Capitalism")
                                                                ?.value}
                                                        </p>
                                                    </div>
                                                    <div class="flex w-full items-center justify-start gap-1">
                                                        <img src="/emoji/cg_donated.webp" alt="CG Donated" class="w-6 shrink-0" />
                                                        <p class="text-gray-300">
                                                            CG Donated: {playerInfo?.achievements.find((ach) => ach.name === "Most Valuable Clanmate")
                                                                ?.value}
                                                        </p>
                                                    </div>
                                                </div>
                                            {:catch error}
                                                <div transition:slide class="flex w-full items-center justify-center gap-1">
                                                    <p class="text-red-400">{error.message}</p>
                                                </div>
                                            {/await}
                                        {/if}
                                    </div>
                                    <div class="flex w-full items-center justify-evenly gap-5">
                                        {#if type === "pending"}
                                            <CocButton
                                                type="success"
                                                size="sm"
                                                class="w-full"
                                                {disabled}
                                                onclick={async () => {
                                                    await handleApplication(
                                                        application.tag,
                                                        application.playerData.name,
                                                        "accepted",
                                                        application.discordId
                                                    );
                                                }}
                                            >
                                                <MaterialSymbolsCheckRounded class="size-6" />
                                                Accept
                                            </CocButton>
                                            <CocButton
                                                type="danger"
                                                size="sm"
                                                class="w-full"
                                                {disabled}
                                                onclick={async () => {
                                                    await handleApplication(application.tag, application.playerData.name, "rejected");
                                                }}
                                            >
                                                <MaterialSymbolsCloseRounded class="size-6" />
                                                Reject
                                            </CocButton>
                                        {:else if type === "accepted" || type === "rejected"}
                                            {#if type === "rejected"}
                                                <CocButton
                                                    type="success"
                                                    size="sm"
                                                    class="w-full"
                                                    {disabled}
                                                    onclick={async () => {
                                                        await handleApplication(
                                                            application.tag,
                                                            application.playerData.name,
                                                            "accepted",
                                                            application.discordId
                                                        );
                                                    }}
                                                >
                                                    <MaterialSymbolsCheckRounded class="size-6" />
                                                    Accept
                                                </CocButton>
                                            {/if}
                                            <CocButton
                                                type="danger"
                                                size="sm"
                                                class="w-full"
                                                {disabled}
                                                onclick={async () => {
                                                    await handleApplication(
                                                        application.tag,
                                                        application.playerData.name,
                                                        "deleted",
                                                        application.discordId
                                                    );
                                                }}
                                            >
                                                <MaterialSymbolsDeleteRounded class="size-6" />
                                                Delete
                                            </CocButton>
                                        {/if}
                                    </div>
                                </div>
                            {/each}
                        </ul>
                    {/if}
                </li>
            {/if}
        {/each}
    {/if}
</ul>
