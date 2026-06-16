<script lang="ts">
    import Badge from "$lib/components/ui/Badge.svelte";
    import Button from "$lib/components/ui/Button.svelte";
    import Input from "$lib/components/ui/Input.svelte";
    import type { Component } from "svelte";
    import SimpleIconsDiscord from "~icons/simple-icons/discord";
    import SvgSpinnersRingResize from "~icons/svg-spinners/ring-resize";
    import TablerAlertTriangle from "~icons/tabler/alert-triangle";
    import TablerCheck from "~icons/tabler/check";
    import TablerDeviceFloppy from "~icons/tabler/device-floppy";
    import TablerFlag from "~icons/tabler/flag";
    import TablerPlus from "~icons/tabler/plus";
    import TablerRosetteDiscountCheck from "~icons/tabler/rosette-discount-check";
    import TablerTargetArrow from "~icons/tabler/target-arrow";

    type DiscordFieldResult = { valid: boolean; name?: string; reason?: string };

    export interface ClanForm {
        cocClanCode: string;
        cocClanName: string;
        cocClanLevel: string;
        cocClanTag: string;
        discordClanRoleId: string;
        discordClanChannelId: string;
        discordMemberRoleId: string;
        discordElderRoleId: string;
        discordColeaderRoleId: string;
        discordLeaderRoleId: string;
        discordLeaderId: string;
        attacksRequirement: number;
        donationsRequirement: number;
        clangamesRequirement: number;
    }

    interface Props {
        editingId: number | null;
        form: ClanForm;
        saving?: boolean;
        verifying?: boolean;
        verified?: boolean;
        discordResults?: Record<string, DiscordFieldResult> | null;
        onSubmit: () => void;
        onCancel: () => void;
    }

    let {
        editingId,
        form = $bindable(),
        saving = false,
        verifying = false,
        verified = false,
        discordResults = null,
        onSubmit,
        onCancel,
    }: Props = $props();

    let isEditing = $derived(editingId !== null);

    // All Discord IDs must be filled before verify/save.
    let discordFilled = $derived(
        [
            form.discordClanRoleId,
            form.discordClanChannelId,
            form.discordMemberRoleId,
            form.discordElderRoleId,
            form.discordColeaderRoleId,
            form.discordLeaderRoleId,
            form.discordLeaderId,
        ].every((v) => v.trim() !== ""),
    );
</script>

{#snippet sectionHeader(icon: Component, title: string)}
    {@const SectionIcon = icon}
    <div class="flex items-center gap-2 text-stone-400">
        <SectionIcon class="size-5 shrink-0" />
        <h4 class="text-xs font-semibold tracking-wide uppercase">{title}</h4>
    </div>
{/snippet}

{#snippet idStatus(field: string)}
    {@const result = discordResults?.[field]}
    {#if result?.valid}
        <Badge variant="green" icon={TablerCheck} content={result.name ?? "Valid"} class="max-w-full" />
    {:else if result}
        <Badge variant="red" icon={TablerAlertTriangle} content={result.reason ?? "Invalid"} class="max-w-full" />
    {/if}
{/snippet}

<div class="flex size-full flex-col overflow-hidden">
    <div class="flex items-center gap-4">
        <div class="flex-1 overflow-hidden">
            <h3 class="truncate text-xl font-medium text-stone-50">{isEditing ? "Edit Clan" : "Add Clan"}</h3>
            <p class="truncate text-xs text-stone-400">
                {isEditing
                    ? "Update this clan's details, Discord links and requirements."
                    : "Register a JPA clan with its Discord links and requirements."}
            </p>
        </div>
    </div>

    <div class="flex-1 overflow-y-auto py-4 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div class="flex flex-col gap-6">
            <!-- Clan details -->
            <section class="flex flex-col gap-3">
                {@render sectionHeader(TablerFlag, "Clan details")}
                <div class="grid grid-cols-2 gap-3">
                    <div class="flex flex-col items-start gap-1">
                        <p class="text-sm font-medium">Clan code</p>
                        <Input placeholder="e.g. main" bind:value={form.cocClanCode} disabled={saving} />
                    </div>
                    <div class="flex flex-col items-start gap-1">
                        <p class="text-sm font-medium">Clan level</p>
                        <Input type="number" min={0} placeholder="e.g. 20" bind:value={form.cocClanLevel} disabled={saving} />
                    </div>
                    <div class="col-span-2 flex flex-col items-start gap-1">
                        <p class="text-sm font-medium">Clan tag</p>
                        <Input placeholder="#ABC123" bind:value={form.cocClanTag} disabled={saving} />
                    </div>
                    <div class="col-span-2 flex flex-col items-start gap-1">
                        <p class="text-sm font-medium">Clan name</p>
                        <Input placeholder="Clan name" bind:value={form.cocClanName} disabled={saving} />
                    </div>
                </div>
            </section>

            <!-- Discord IDs -->
            <section class="flex flex-col gap-3">
                {@render sectionHeader(SimpleIconsDiscord, "Discord IDs")}
                <div class="grid grid-cols-2 gap-3">
                    <div class="flex flex-col items-start gap-1">
                        <p class="text-sm font-medium">Clan role</p>
                        <Input placeholder="Role ID" bind:value={form.discordClanRoleId} disabled={saving} />
                        {@render idStatus("discordClanRoleId")}
                    </div>
                    <div class="flex flex-col items-start gap-1">
                        <p class="text-sm font-medium">Clan channel</p>
                        <Input placeholder="Channel ID" bind:value={form.discordClanChannelId} disabled={saving} />
                        {@render idStatus("discordClanChannelId")}
                    </div>
                    <div class="flex flex-col items-start gap-1">
                        <p class="text-sm font-medium">Member role</p>
                        <Input placeholder="Role ID" bind:value={form.discordMemberRoleId} disabled={saving} />
                        {@render idStatus("discordMemberRoleId")}
                    </div>
                    <div class="flex flex-col items-start gap-1">
                        <p class="text-sm font-medium">Elder role</p>
                        <Input placeholder="Role ID" bind:value={form.discordElderRoleId} disabled={saving} />
                        {@render idStatus("discordElderRoleId")}
                    </div>
                    <div class="flex flex-col items-start gap-1">
                        <p class="text-sm font-medium">Co-leader role</p>
                        <Input placeholder="Role ID" bind:value={form.discordColeaderRoleId} disabled={saving} />
                        {@render idStatus("discordColeaderRoleId")}
                    </div>
                    <div class="flex flex-col items-start gap-1">
                        <p class="text-sm font-medium">Leader role</p>
                        <Input placeholder="Role ID" bind:value={form.discordLeaderRoleId} disabled={saving} />
                        {@render idStatus("discordLeaderRoleId")}
                    </div>
                    <div class="col-span-2 flex flex-col items-start gap-1">
                        <p class="text-sm font-medium">Leader user</p>
                        <Input placeholder="User ID" bind:value={form.discordLeaderId} disabled={saving} />
                        {@render idStatus("discordLeaderId")}
                    </div>
                </div>
            </section>

            <!-- Requirements -->
            <section class="flex flex-col gap-3">
                {@render sectionHeader(TablerTargetArrow, "Requirements")}
                <div class="grid grid-cols-2 gap-3">
                    <div class="flex flex-col items-start gap-1">
                        <p class="text-sm font-medium">Attacks</p>
                        <Input type="number" min={0} placeholder="0" bind:value={form.attacksRequirement} disabled={saving} />
                    </div>
                    <div class="flex flex-col items-start gap-1">
                        <p class="text-sm font-medium">Donations</p>
                        <Input type="number" min={0} placeholder="0" bind:value={form.donationsRequirement} disabled={saving} />
                    </div>
                    <div class="col-span-2 flex flex-col items-start gap-1">
                        <p class="text-sm font-medium">Clan games</p>
                        <Input type="number" min={0} placeholder="0" bind:value={form.clangamesRequirement} disabled={saving} />
                    </div>
                </div>
            </section>
        </div>
    </div>

    <div class="space-y-2 border-t border-stone-700/50 pt-4">
        <Button class="w-full gap-2" variant="base" disabled={saving || verifying || !discordFilled} onclick={onSubmit}>
            {#if verifying}
                <SvgSpinnersRingResize class="size-5" />
                Verifying...
            {:else if saving}
                <SvgSpinnersRingResize class="size-5" />
                Saving...
            {:else if !verified}
                <TablerRosetteDiscountCheck class="size-5" />
                Verify
            {:else if isEditing}
                <TablerDeviceFloppy class="size-5" />
                Save Changes
            {:else}
                <TablerPlus class="size-5" />
                Add Clan
            {/if}
        </Button>
        <Button class="w-full" variant="ghost" disabled={saving || verifying} onclick={onCancel}>Cancel</Button>
    </div>
</div>
