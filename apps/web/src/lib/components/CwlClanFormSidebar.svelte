<script lang="ts">
    import Button from "$lib/components/ui/Button.svelte";
    import Input from "$lib/components/ui/Input.svelte";
    import SvgSpinnersRingResize from "~icons/svg-spinners/ring-resize";
    import TablerDeviceFloppy from "~icons/tabler/device-floppy";
    import TablerPlus from "~icons/tabler/plus";

    interface ClanForm {
        cocClanTag: string;
        cocClanName: string;
        cocClanLeague: string;
        cocClanLeader: string;
    }

    interface Props {
        editingTag: string | null;
        form: ClanForm;
        saving?: boolean;
        onSubmit: () => void;
        onCancel: () => void;
    }

    let { editingTag, form = $bindable(), saving = false, onSubmit, onCancel }: Props = $props();

    let isEditing = $derived(editingTag !== null);
</script>

<div class="flex size-full flex-col overflow-hidden">
    <div class="flex items-center gap-4">
        <div class="flex-1 overflow-hidden">
            <h3 class="truncate text-xl font-medium text-stone-50">{isEditing ? "Edit CWL Clan" : "Add CWL Clan"}</h3>
            <p class="truncate text-xs text-stone-400">
                {isEditing ? "Update this CWL clan's details." : "Register a clan so it can be assigned CWL applications."}
            </p>
        </div>
    </div>

    <div class="flex-1 overflow-y-auto py-4 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div class="flex flex-col gap-4">
            <div class="flex flex-col items-start justify-center gap-1">
                <p class="text-sm font-medium">Clan tag</p>
                <Input placeholder="#ABC123" bind:value={form.cocClanTag} disabled={saving || isEditing} />
                {#if isEditing}
                    <p class="text-xs text-stone-400">The clan tag can't be changed. Remove and re-add the clan to change it.</p>
                {/if}
            </div>
            <div class="flex flex-col items-start justify-center gap-1">
                <p class="text-sm font-medium">Clan name</p>
                <Input placeholder="Clan name" bind:value={form.cocClanName} disabled={saving} />
            </div>
            <div class="flex flex-col items-start justify-center gap-1">
                <p class="text-sm font-medium">League</p>
                <Input placeholder="e.g. Master League I" bind:value={form.cocClanLeague} disabled={saving} />
            </div>
            <div class="flex flex-col items-start justify-center gap-1">
                <p class="text-sm font-medium">Leader</p>
                <Input placeholder="Leader name" bind:value={form.cocClanLeader} disabled={saving} />
            </div>
        </div>
    </div>

    <div class="space-y-2 border-t border-stone-700/50 pt-4">
        <Button class="w-full gap-2" variant="base" disabled={saving} onclick={onSubmit}>
            {#if saving}
                <SvgSpinnersRingResize class="size-5" />
                Saving...
            {:else if isEditing}
                <TablerDeviceFloppy class="size-5" />
                Save Changes
            {:else}
                <TablerPlus class="size-5" />
                Add Clan
            {/if}
        </Button>
        <Button class="w-full" variant="ghost" disabled={saving} onclick={onCancel}>Cancel</Button>
    </div>
</div>
