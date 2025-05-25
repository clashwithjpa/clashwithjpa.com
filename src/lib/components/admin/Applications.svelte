<script lang="ts">
    import { invalidateAll } from "$app/navigation";
    import type { APIPlayer } from "$lib/coc/types";
    import { Button } from "$lib/components/ui/button";
    import * as Card from "$lib/components/ui/card";
    import UserName from "$lib/components/admin/UserName.svelte";
    import type { SelectClanApplication } from "$lib/server/schema";
    import { textOverflow } from "$lib/utils";
    import { toast } from "svelte-sonner";
    import { fade, slide } from "svelte/transition";
    import HugeiconsMoneyReceiveCircle from "~icons/hugeicons/money-receive-circle";
    import HugeiconsMoneySendCircle from "~icons/hugeicons/money-send-circle";
    import LineMdChevronSmallDown from "~icons/line-md/chevron-small-down";
    import LineMdChevronSmallRight from "~icons/line-md/chevron-small-right";
    import LogosDiscordIcon from "~icons/logos/discord-icon";
    import MaterialSymbolsCheckRounded from "~icons/material-symbols/check-rounded";
    import MaterialSymbolsCloseRounded from "~icons/material-symbols/close-rounded";
    import MaterialSymbolsDeleteRounded from "~icons/material-symbols/delete-rounded";

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

<ul class="mt-2 flex flex-col gap-5">
    {#if sortedApps.length === 0}
        <p class="text-muted-foreground">No {type} applications found</p>
    {:else}
        {#each sortedApps as [date, apps], idx}
            {#if apps.length > 0}
                <li class="flex w-full flex-col items-start justify-center">
                    <button class="text-muted-foreground flex w-full items-center" onclick={() => (hidden[idx] = !hidden[idx])}>
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
                        <span class="border-muted-foreground mx-2 grow rounded-xl border-t"></span>
                        {apps.length}
                        {apps.length > 1 ? "Applications" : "Application"}
                    </button>
                    {#if !hidden[idx]}
                        <ul transition:slide class="mt-2 flex w-full flex-wrap items-start justify-center gap-2 md:justify-start">
                            {#each apps as application, appIdx}
                                <Card.Root class="gap-2 p-5">
                                    <Card.Header class="p-0" style="container-type: inherit;">
                                        <div class="flex w-full items-center justify-between gap-2">
                                            <img
                                                src="/townhall/{application.playerData.townHallLevel}.webp"
                                                alt="TH {application.playerData.townHallLevel}"
                                                class="size-15 rounded-lg"
                                            />
                                            <div class="flex w-full flex-col items-start justify-center">
                                                <Card.Title class="overflow-hidden text-lg font-bold">
                                                    {textOverflow(application.playerData.name, 8)}
                                                </Card.Title>
                                                <Card.Description class="text-sm">
                                                    {application.tag}
                                                </Card.Description>
                                            </div>
                                            <p class="text-muted-foreground w-full text-sm">
                                                {new Date(application.createdAt).toLocaleTimeString("en-IN", {
                                                    hour: "numeric",
                                                    minute: "numeric"
                                                })}
                                            </p>
                                        </div>
                                    </Card.Header>
                                    <Card.Content class="flex flex-col items-start justify-center gap-2 p-0">
                                        <div class="text-muted-foreground flex w-full flex-col items-center justify-center text-sm">
                                            <button
                                                onclick={() => (hiddenInfo[appIdx + idx] = !hiddenInfo[appIdx + idx])}
                                                class="group flex w-full items-center justify-center gap-1"
                                            >
                                                <span class="border-muted-foreground grow rounded-xl border-t"></span>
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
                                                <span class="border-muted-foreground grow rounded-xl border-t"></span>
                                            </button>
                                            {#if !hiddenInfo[appIdx + idx]}
                                                {#await fetchPlayerInfo(application.tag)}
                                                    <div in:slide class="flex w-full flex-col items-start justify-center gap-1">
                                                        {#each new Array(5) as _}
                                                            <div class="flex w-full animate-pulse items-center justify-start gap-1">
                                                                <div class="bg-muted-foreground size-6 shrink-0 rounded-lg"></div>
                                                                <div class="bg-muted-foreground h-4 w-2/3 rounded-md"></div>
                                                            </div>
                                                        {/each}
                                                        <div class="flex w-full items-center justify-center gap-1">
                                                            <span class="border-muted-foreground grow rounded-xl border-t"></span>
                                                            Donations
                                                            <span class="border-muted-foreground grow rounded-xl border-t"></span>
                                                        </div>
                                                        {#each new Array(3) as _}
                                                            <div class="flex w-full animate-pulse items-center justify-start gap-1">
                                                                <div class="bg-muted-foreground size-6 shrink-0 rounded-lg"></div>
                                                                <div class="bg-muted-foreground h-4 w-2/3 rounded-md"></div>
                                                            </div>
                                                        {/each}
                                                        <div class="flex w-full items-center justify-center gap-1">
                                                            <span class="border-muted-foreground grow rounded-xl border-t"></span>
                                                            Achievements
                                                            <span class="border-muted-foreground grow rounded-xl border-t"></span>
                                                        </div>
                                                        {#each new Array(5) as _}
                                                            <div class="flex w-full animate-pulse items-center justify-start gap-1">
                                                                <div class="bg-muted-foreground size-6 shrink-0 rounded-lg"></div>
                                                                <div class="bg-muted-foreground h-4 w-2/3 rounded-md"></div>
                                                            </div>
                                                        {/each}
                                                    </div>
                                                {:then playerInfo}
                                                    <div transition:fade class="flex w-full flex-col items-start justify-center gap-1">
                                                        <div class="flex w-full items-center justify-start gap-1">
                                                            <img src="/emoji/trophy.webp" alt="Trophies" class="size-6 shrink-0" />
                                                            <p class="text-secondary-foreground font-bold">Trophies:</p>
                                                            <p class="text-foreground">{playerInfo?.trophies}</p>
                                                        </div>
                                                        <div class="flex w-full items-center justify-start gap-1">
                                                            <img src="/emoji/attack.webp" alt="Attack Wins" class="size-6 shrink-0" />
                                                            <p class="text-secondary-foreground font-bold">Attack Wins:</p>
                                                            <p class="text-foreground">{playerInfo?.attackWins}</p>
                                                        </div>
                                                        <div class="flex w-full items-center justify-start gap-1">
                                                            <img src="/emoji/defence.webp" alt="Defence Wins" class="size-6 shrink-0" />
                                                            <p class="text-secondary-foreground font-bold">Defence Wins:</p>
                                                            <p class="text-foreground">{playerInfo?.defenseWins}</p>
                                                        </div>
                                                        <div class="flex w-full items-center justify-start gap-1">
                                                            <LogosDiscordIcon class="text-blurple size-6 shrink-0" />
                                                            <p class="text-secondary-foreground font-bold">Discord:</p>
                                                            <UserName userID={application.discordId} />
                                                        </div>
                                                        <div class="flex w-full items-center justify-start gap-1">
                                                            <img src="/emoji/info.webp" alt="More Info" class="w-6 shrink-0" />
                                                            <p class="text-secondary-foreground font-bold">More Info:</p>
                                                            <a
                                                                href="https://cc.fwafarm.com/cc_n/member.php?tag={encodeURIComponent(
                                                                    application.tag
                                                                )}"
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                class="text-blue-400 hover:underline">Click here</a
                                                            >
                                                        </div>
                                                        <div class="flex w-full items-center justify-center gap-1">
                                                            <span class="border-muted-foreground grow rounded-xl border-t"></span>
                                                            Donations
                                                            <span class="border-muted-foreground grow rounded-xl border-t"></span>
                                                        </div>
                                                        <div class="flex w-full items-center justify-start gap-1">
                                                            <HugeiconsMoneySendCircle class="size-6 shrink-0 text-yellow-400" />
                                                            <p class="text-secondary-foreground font-bold">Donated:</p>
                                                            <p class="text-foreground">{playerInfo?.donations}</p>
                                                        </div>
                                                        <div class="flex w-full items-center justify-start gap-1">
                                                            <HugeiconsMoneyReceiveCircle class="size-6 shrink-0 text-yellow-400" />
                                                            <p class="text-secondary-foreground font-bold">Received:</p>
                                                            <p class="text-foreground">{playerInfo?.donationsReceived}</p>
                                                        </div>
                                                        <div class="flex w-full items-center justify-center gap-1">
                                                            <span class="border-muted-foreground grow rounded-xl border-t"></span>
                                                            Achievements
                                                            <span class="border-muted-foreground grow rounded-xl border-t"></span>
                                                        </div>
                                                        <div class="flex w-full items-center justify-start gap-1">
                                                            <img src="/emoji/donations.webp" alt="Total Donations" class="w-6 shrink-0" />
                                                            <p class="text-secondary-foreground font-bold">Total Donations:</p>
                                                            <p class="text-foreground">
                                                                {playerInfo?.achievements.find((ach) => ach.name === "Friend in Need")?.value}
                                                            </p>
                                                        </div>
                                                        <div class="flex w-full items-center justify-start gap-1">
                                                            <img src="/emoji/trophy2.webp" alt="Best Trophies" class="size-6 shrink-0" />
                                                            <p class="text-secondary-foreground font-bold">Best Trophies:</p>
                                                            <p class="text-foreground">{playerInfo?.bestTrophies}</p>
                                                        </div>
                                                        <div class="flex w-full items-center justify-start gap-1">
                                                            <img src="/emoji/clangames.webp" alt="Clan Games" class="w-6 shrink-0" />
                                                            <p class="text-secondary-foreground font-bold">Clan Games:</p>
                                                            <p class="text-foreground">
                                                                {playerInfo?.achievements.find((ach) => ach.name === "Games Champion")?.value}
                                                            </p>
                                                        </div>
                                                        <div class="flex w-full items-center justify-start gap-1">
                                                            <img src="/emoji/cg_raid.webp" alt="CG Raided" class="w-6 shrink-0" />
                                                            <p class="text-secondary-foreground font-bold">CG Raided:</p>
                                                            <p class="text-foreground">
                                                                {playerInfo?.achievements.find((ach) => ach.name === "Aggressive Capitalism")?.value}
                                                            </p>
                                                        </div>
                                                        <div class="flex w-full items-center justify-start gap-1">
                                                            <img src="/emoji/cg_donated.webp" alt="CG Donated" class="w-6 shrink-0" />
                                                            <p class="text-secondary-foreground font-bold">CG Donated:</p>
                                                            <p class="text-foreground">
                                                                {playerInfo?.achievements.find((ach) => ach.name === "Most Valuable Clanmate")?.value}
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
                                        <div class="flex w-full items-center justify-evenly gap-2">
                                            {#if type === "pending"}
                                                <Button
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
                                                </Button>
                                                <Button
                                                    variant="destructive"
                                                    {disabled}
                                                    onclick={async () => {
                                                        await handleApplication(application.tag, application.playerData.name, "rejected");
                                                    }}
                                                >
                                                    <MaterialSymbolsCloseRounded class="size-6" />
                                                    Reject
                                                </Button>
                                            {:else if type === "accepted" || type === "rejected"}
                                                {#if type === "rejected"}
                                                    <Button
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
                                                    </Button>
                                                {/if}
                                                <Button
                                                    variant="destructive"
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
                                                </Button>
                                            {/if}
                                        </div>
                                    </Card.Content>
                                </Card.Root>
                            {/each}
                        </ul>
                    {/if}
                </li>
            {/if}
        {/each}
    {/if}
</ul>
