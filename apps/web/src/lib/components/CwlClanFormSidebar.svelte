<script lang="ts">
    import Button from "$lib/components/ui/Button.svelte";
    import Input from "$lib/components/ui/Input.svelte";
    import SvgSpinnersRingResize from "~icons/svg-spinners/ring-resize";
    import TablerPlus from "~icons/tabler/plus";

    interface ClanForm {
        cocClanTag: string;
    }

    interface Props {
        form: ClanForm;
        saving?: boolean;
        onSubmit: () => void;
        onCancel: () => void;
    }

    let { form = $bindable(), saving = false, onSubmit, onCancel }: Props = $props();
</script>

<div class="flex size-full flex-col overflow-hidden">
    <div class="flex items-center gap-4">
        <div class="flex-1 overflow-hidden">
            <h3 class="truncate text-xl font-medium text-stone-50">Add CWL Clan</h3>
            <p class="truncate text-xs text-stone-400">Register a clan so it can be assigned CWL applications.</p>
        </div>
    </div>

    <div class="flex-1 overflow-y-auto py-4 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div class="flex flex-col gap-4">
            <div class="flex flex-col items-start justify-center gap-1">
                <p class="text-sm font-medium">Clan tag</p>
                <Input placeholder="#ABC123" bind:value={form.cocClanTag} disabled={saving} />
                <p class="text-xs text-stone-400">Clan name, league, and leader are fetched automatically from the Clash of Clans API.</p>
            </div>
        </div>
    </div>

    <div class="space-y-2 border-t border-stone-700/50 pt-4">
        <Button class="w-full gap-2" variant="base" disabled={saving} onclick={onSubmit}>
            {#if saving}
                <SvgSpinnersRingResize class="size-5" />
                Saving...
            {:else}
                <TablerPlus class="size-5" />
                Add Clan
            {/if}
        </Button>
        <Button class="w-full" variant="ghost" disabled={saving} onclick={onCancel}>Cancel</Button>
    </div>
</div>
