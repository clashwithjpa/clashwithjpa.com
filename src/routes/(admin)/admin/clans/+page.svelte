<script lang="ts">
    import { invalidateAll } from "$app/navigation";
    import { page } from "$app/state";
    import { clanForm, clanFormSchema } from "$lib/coc/schema";
    import Button from "$lib/components/app/ui/Button.svelte";
    import ClanInfo from "$lib/components/app/ClanInfo.svelte";
    import InlineLink from "$lib/components/app/ui/InlineLink.svelte";
    import { toast } from "$lib/components/app/toast";
    import { Popover, Tooltip } from "bits-ui";
    import { Control, Description, Field, FieldErrors } from "formsnap";
    import { expoIn, expoOut } from "svelte/easing";
    import { fly, slide } from "svelte/transition";
    import { superForm } from "sveltekit-superforms";
    import { zodClient } from "sveltekit-superforms/adapters";
    import MaterialSymbolsCheckRounded from "~icons/material-symbols/check-rounded";
    import MaterialSymbolsCloseRounded from "~icons/material-symbols/close-rounded";
    import MaterialSymbolsEditRounded from "~icons/material-symbols/edit-rounded";
    import MaterialSymbolsKeyboardDoubleArrowDownRounded from "~icons/material-symbols/keyboard-double-arrow-down-rounded";
    import MaterialSymbolsKeyboardDoubleArrowUpRounded from "~icons/material-symbols/keyboard-double-arrow-up-rounded";
    import TablerLoader2 from "~icons/tabler/loader-2";
    import type { PageData } from "./$types";

    let { data }: { data: PageData } = $props();

    let reset = $state<() => void>();
    const form = superForm(data.form, {
        validators: zodClient(clanFormSchema),
        onUpdated() {
            reset?.();
        }
    });
    const { form: formData, enhance, message, delayed, errors } = form;
    let openTooltip: boolean[] = $state(Array(Object.keys(clanForm).length).fill(false));
    $effect(() => {
        if ($message && (page.status === 200 || page.status == 400)) {
            switch (page.status) {
                case 200:
                    toast.success($message);
                    break;
                case 400:
                    toast.error($message);
                    break;
            }
        }
    });

    let hidden: boolean[] = $state(Array(data.clans.length).fill(true));
    let disabled: {
        input: boolean;
        button: boolean;
    } = $state({
        input: false,
        button: true
    });
    $effect(() => {
        disabled.input = $delayed;
        disabled.button =
            !Object.values(formData).every((v) => v !== undefined && v !== null) || data.clans.some((clan) => clan.clanTag == $formData.tag);
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function getInputLen(data: any) {
        const len = (data ?? "").toString().length;
        return `${Math.min(len, 8) + 2}ch`;
    }

    async function removeClan(tag: string, name: string | undefined) {
        disabled.input = true;
        disabled.button = true;
        const body = {
            key: "remove_clan",
            value: tag
        };
        let response = await fetch("/api/clans", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body)
        });

        if (response.ok) {
            toast.success(`Removed clan ${name || tag}`);
            invalidateAll();
        } else {
            toast.error("Failed to remove clan");
        }
        setTimeout(() => {
            disabled.input = false;
            disabled.button = false;
        }, 2000);
    }

    let clanData: {
        [key: string]: {
            disabled: boolean;
            attacksRequirement: number;
            donationsRequirement: number;
            clangamesRequirement: number;
        };
    } = $state(
        Object.fromEntries(
            data.clans.map((clan) => [
                clan.clanTag,
                {
                    disabled: true,
                    attacksRequirement: clan.attacksRequirement,
                    donationsRequirement: clan.donationsRequirement,
                    clangamesRequirement: clan.clangamesRequirement
                }
            ])
        )
    );
    async function editClan(tag: string, name: string | undefined) {
        disabled.input = true;
        disabled.button = true;
        clanData[tag].disabled = true;
        const body = {
            key: "edit_clan",
            value: {
                tag,
                attacksRequirement: clanData[tag].attacksRequirement,
                donationsRequirement: clanData[tag].donationsRequirement,
                clangamesRequirement: clanData[tag].clangamesRequirement
            }
        };
        let response = await fetch("/api/clans", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body)
        });

        if (response.ok) {
            toast.success(`Edited clan ${name || tag}`);
            invalidateAll();
        } else {
            toast.error("Failed to edit clan");
        }
        setTimeout(() => {
            disabled.input = false;
            disabled.button = false;
        }, 2000);
    }
</script>

<div class="flex size-full flex-col gap-5 overflow-auto p-5 md:p-11">
    <h1 class="text-4xl">Add Clan</h1>
    <form method="POST" action="/admin/clans" use:enhance class="flex w-full flex-col gap-4">
        <div class="flex w-full flex-wrap items-start justify-center gap-2">
            {#each Object.keys(clanForm) as key, idx}
                <div class="flex w-full grow cursor-default flex-col gap-2 md:w-fit">
                    <Field {form} name={key as keyof typeof $formData}>
                        <Description>{clanForm[key].desc}</Description>
                        <Tooltip.Provider>
                            <Tooltip.Root delayDuration={0} bind:open={openTooltip[idx]} disableCloseOnTriggerClick>
                                <Tooltip.Trigger class="flex w-full grow">
                                    <Control>
                                        {#snippet children({ props })}
                                            <input
                                                {...props}
                                                onclick={() => (openTooltip[idx] = !openTooltip[idx])}
                                                disabled={disabled.input}
                                                class="w-full rounded-lg border border-gray-700 {$errors[key as keyof typeof $formData]
                                                    ? 'border-red-700!'
                                                    : ''}"
                                                type={clanForm[key].type}
                                                placeholder={clanForm[key].placeholder}
                                                bind:value={$formData[key as keyof typeof $formData]}
                                            />
                                        {/snippet}
                                    </Control>
                                </Tooltip.Trigger>
                                <Tooltip.Portal>
                                    <Tooltip.Content
                                        class="rounded-lg border border-gray-700 bg-linear-to-r from-gray-900 via-gray-800 to-gray-900 p-2
                                        {$errors[key as keyof typeof $formData] ? '' : 'hidden'}"
                                    >
                                        <FieldErrors class="text-xs text-red-400" />
                                        <Tooltip.Arrow class="text-gray-700" />
                                    </Tooltip.Content>
                                </Tooltip.Portal>
                            </Tooltip.Root>
                        </Tooltip.Provider>
                    </Field>
                </div>
            {/each}
        </div>
        <Button disabled={disabled.button || $delayed} type="submit" class="w-full px-4 py-3 {$delayed ? 'cursor-wait' : ''}">
            {#if $delayed}
                <span in:fly class="flex size-full items-center justify-center gap-2">
                    <TablerLoader2 class="size-5 animate-spin"></TablerLoader2>
                    Submitting...
                </span>
            {:else}
                <span in:fly class="flex size-full items-center justify-center">Submit</span>
            {/if}
        </Button>
    </form>
    <h1 class="text-4xl">Clans {data.clans.length}</h1>
    <div class="flex w-full flex-col items-center justify-center">
        <div class="flex w-full flex-col items-center">
            <div class="flex w-full flex-wrap items-start justify-center gap-2 md:justify-start">
                {#each data.clans as clan, idx}
                    <div in:fly={{ duration: 500, easing: expoIn, x: -100, y: 0 }} out:fly={{ duration: 500, easing: expoOut, x: 100, y: 0 }}>
                        <div class="flex flex-col justify-between rounded-xl border border-gray-700">
                            <div class="flex w-80 items-center gap-2 p-4">
                                <img class="size-20" src={clan.clanData?.badgeUrls.medium} alt={clan.clanData?.name} />
                                <div class="flex size-full flex-col items-start">
                                    <div class="flex size-full items-start justify-between">
                                        <h2 class="text-2xl">{clan.clanData?.name}</h2>
                                        <Button
                                            class="size-fit p-1"
                                            disabled={disabled.input}
                                            onclick={async () => {
                                                await removeClan(clan.clanTag, clan.clanData?.name);
                                            }}
                                        >
                                            <MaterialSymbolsCloseRounded class="size-full" />
                                        </Button>
                                    </div>
                                    <p class="text-sm">{clan.clanData?.tag}</p>
                                    <div class="flex size-full items-start justify-between">
                                        <p class="text-sm">LVL. {clan.clanData?.clanLevel}</p>
                                        <Button class="size-fit p-1" disabled={disabled.input} onclick={() => (hidden[idx] = !hidden[idx])}>
                                            {#if hidden[idx]}
                                                <span in:fly class="size-full">
                                                    <MaterialSymbolsKeyboardDoubleArrowDownRounded class="size-full" />
                                                </span>
                                            {:else}
                                                <span in:fly class="size-full">
                                                    <MaterialSymbolsKeyboardDoubleArrowUpRounded class="size-full" />
                                                </span>
                                            {/if}
                                        </Button>
                                    </div>
                                </div>
                            </div>
                            {#if !hidden[idx]}
                                <div transition:slide={{ axis: "y" }} class="flex flex-col justify-between transition-opacity">
                                    <div
                                        class="flex flex-col rounded-xl border-y border-gray-700 bg-linear-to-r from-gray-900 via-gray-800 to-gray-900 p-4"
                                    >
                                        <div class="flex flex-col items-start gap-2">
                                            <div class="flex items-center gap-1">
                                                <img class="size-8 min-w-8" src="/labels/international.webp" alt="Members" />
                                                <p>{clan.clanData?.members} Members</p>
                                            </div>
                                        </div>
                                        <div class="mt-4 flex flex-col items-start gap-2 transition">
                                            <Popover.Root>
                                                <Popover.Trigger class="flex items-center space-x-1 transition-all duration-300 ease-in-out">
                                                    <InlineLink class="text-sm">Clan Info</InlineLink>
                                                </Popover.Trigger>
                                                <Popover.Portal>
                                                    <Popover.Content class="max-w-80 rounded-xl p-2">
                                                        <div
                                                            class="flex flex-col rounded-xl border border-gray-700 bg-linear-to-r from-gray-900 via-gray-800 to-gray-900 p-4"
                                                        >
                                                            <ClanInfo {clan} />
                                                        </div>
                                                    </Popover.Content>
                                                </Popover.Portal>
                                            </Popover.Root>
                                            <InlineLink
                                                href={`https://link.clashofclans.com/en?action=OpenClanProfile&tag=${clan.clanData?.tag}`}
                                                arrow={true}
                                                newTab={true}
                                            >
                                                <span>Open in Game</span>
                                            </InlineLink>
                                        </div>
                                    </div>
                                    <div class="flex w-full flex-col">
                                        <div class="flex size-full items-center justify-evenly p-4">
                                            <p>Minimum Requirements</p>
                                            <Button
                                                class="size-fit p-1"
                                                disabled={disabled.input}
                                                onclick={() => {
                                                    clanData[clan.clanTag].disabled = !clanData[clan.clanTag].disabled;
                                                    if (clanData[clan.clanTag].disabled) {
                                                        clanData[clan.clanTag].attacksRequirement = clan.attacksRequirement;
                                                        clanData[clan.clanTag].donationsRequirement = clan.donationsRequirement;
                                                        clanData[clan.clanTag].clangamesRequirement = clan.clangamesRequirement;
                                                    }
                                                }}
                                            >
                                                {#if clanData[clan.clanTag].disabled}
                                                    <span in:fly class="size-full">
                                                        <MaterialSymbolsEditRounded class="size-full" />
                                                    </span>
                                                {:else}
                                                    <span in:fly class="size-full">
                                                        <MaterialSymbolsCloseRounded class="size-full" />
                                                    </span>
                                                {/if}
                                            </Button>
                                            {#if !clanData[clan.clanTag].disabled}
                                                <div
                                                    in:slide={{ duration: 100, axis: "x" }}
                                                    out:slide={{ duration: 100, axis: "x" }}
                                                    class="flex size-fit items-center justify-center"
                                                >
                                                    <Button
                                                        class="size-fit p-1"
                                                        disabled={disabled.input}
                                                        onclick={() => {
                                                            clanData[clan.clanTag].disabled = true;
                                                            editClan(clan.clanTag, clan.clanData?.name);
                                                        }}
                                                    >
                                                        <span class="size-full">
                                                            <MaterialSymbolsCheckRounded class="size-full" />
                                                        </span>
                                                    </Button>
                                                </div>
                                            {/if}
                                        </div>
                                        <div
                                            class="flex w-full flex-col items-start space-y-2 rounded-xl border-t border-gray-700 bg-linear-to-r from-gray-900 via-gray-800 to-gray-900 p-4"
                                        >
                                            <div class="flex items-center">
                                                <img class="size-11" src={`/labels/attacks.webp`} alt="attacks" />
                                                <div class="ml-2 flex items-center justify-start gap-1">
                                                    <input
                                                        class="bg-transparent! bg-none! opacity-100!"
                                                        class:!border-transparent={clanData[clan.clanTag].disabled || disabled.input}
                                                        style="width: {getInputLen(clanData[clan.clanTag].attacksRequirement)}"
                                                        disabled={clanData[clan.clanTag].disabled || disabled.input}
                                                        placeholder="Attacks"
                                                        type="number"
                                                        bind:value={clanData[clan.clanTag].attacksRequirement}
                                                        oninput={() =>
                                                            (clanData[clan.clanTag].attacksRequirement = Math.max(
                                                                0,
                                                                clanData[clan.clanTag].attacksRequirement
                                                            ))}
                                                    />
                                                    Attacks
                                                </div>
                                            </div>
                                            <div class="flex items-center">
                                                <img class="size-11" src={`/labels/donations.webp`} alt="donations" />
                                                <div class="ml-2 flex items-center justify-start gap-1">
                                                    <input
                                                        class="bg-transparent! bg-none! opacity-100!"
                                                        class:!border-transparent={clanData[clan.clanTag].disabled || disabled.input}
                                                        style="width: {getInputLen(clanData[clan.clanTag].donationsRequirement)}"
                                                        disabled={clanData[clan.clanTag].disabled || disabled.input}
                                                        placeholder="Attacks"
                                                        type="number"
                                                        bind:value={clanData[clan.clanTag].donationsRequirement}
                                                        oninput={() =>
                                                            (clanData[clan.clanTag].donationsRequirement = Math.max(
                                                                0,
                                                                clanData[clan.clanTag].donationsRequirement
                                                            ))}
                                                    />
                                                    Donations
                                                </div>
                                            </div>
                                            <div class="flex items-center">
                                                <img class="size-11" src={`/labels/clangames.webp`} alt="clangames" />
                                                <div class="ml-2 flex items-center justify-start gap-1">
                                                    <input
                                                        class="bg-transparent! bg-none! opacity-100!"
                                                        class:!border-transparent={clanData[clan.clanTag].disabled || disabled.input}
                                                        style="width: {getInputLen(clanData[clan.clanTag].clangamesRequirement)}"
                                                        disabled={clanData[clan.clanTag].disabled || disabled.input}
                                                        placeholder="Attacks"
                                                        type="number"
                                                        bind:value={clanData[clan.clanTag].clangamesRequirement}
                                                        oninput={() =>
                                                            (clanData[clan.clanTag].clangamesRequirement = Math.max(
                                                                0,
                                                                clanData[clan.clanTag].clangamesRequirement
                                                            ))}
                                                    />
                                                    Clan Games
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            {/if}
                        </div>
                    </div>
                {/each}
            </div>
        </div>
    </div>
</div>
