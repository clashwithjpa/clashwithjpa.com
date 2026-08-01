<script lang="ts">
    import Badge from "$lib/components/ui/Badge.svelte";
    import Button from "$lib/components/ui/Button.svelte";
    import Input from "$lib/components/ui/Input.svelte";
    import LevelSlider from "$lib/components/ui/LevelSlider.svelte";
    import { SCOPE_LABELS, scopesUpTo } from "$lib/config/apiKeys";
    import type { JpaPermission } from "@repo/auth-shared";
    import { slide } from "svelte/transition";
    import SvgSpinnersRingResize from "~icons/svg-spinners/ring-resize";
    import TablerAlertTriangle from "~icons/tabler/alert-triangle";
    import TablerPencil from "~icons/tabler/pencil";
    import TablerPlus from "~icons/tabler/plus";
    import TablerX from "~icons/tabler/x";

    let {
        availableScopes,
        creating = false,
        onCreate,
        onCancel,
    }: {
        availableScopes: JpaPermission[];
        creating?: boolean;
        onCreate: (input: { name: string; scope: JpaPermission; expiresIn?: number }) => void | Promise<void>;
        onCancel: () => void;
    } = $props();

    let name = $state("");
    let expiresOn = $state<Date | null>(null);
    // A level, not a set: the `jpa` ladder is cumulative.
    let level = $state<JpaPermission>("apply");

    const levelOptions = $derived(availableScopes.map((scope) => ({ value: scope, label: SCOPE_LABELS[scope].label })));
    const grantsWrites = $derived(scopesUpTo(level).some((scope) => SCOPE_LABELS[scope]?.writes));

    // 364 rather than 365: the chosen day is extended to its final second below,
    // and the plugin rejects anything past 365 days.
    function offsetDate(days: number): string {
        const d = new Date();
        d.setDate(d.getDate() + days);
        return d.toISOString().split("T")[0];
    }
    const minDate = offsetDate(1);
    const maxDate = offsetDate(364);

    function submit() {
        // The picker lands on local midnight, so run it to the day's close —
        // "expires on the 5th" should mean the key still works on the 5th.
        let expiresIn: number | undefined;
        if (expiresOn) {
            const endOfDay = new Date(expiresOn);
            endOfDay.setHours(23, 59, 59, 999);
            expiresIn = Math.round((endOfDay.getTime() - Date.now()) / 1000);
        }
        onCreate({ name: name.trim(), scope: level, expiresIn });
    }
</script>

<div class="flex flex-col gap-6">
    <div class="flex flex-col gap-1">
        <h2 class="text-2xl font-bold">New API Key</h2>
        <p class="text-sm text-stone-400">
            An access level is a role, and each one includes the levels below it. A key set to Manager reaches exactly what a Manager reaches. Grant
            the least it needs, because a leaked key can do everything you give it.
        </p>
    </div>

    <div class="flex flex-col gap-2">
        <label class="text-sm font-medium text-stone-200" for="api-key-name">Name</label>
        <Input id="api-key-name" bind:value={name} placeholder="e.g. CWL roster bot" maxlength={64} disabled={creating} />
        <span class="text-xs text-stone-400">Only ever shown to you — it labels the key in this list and in the audit log.</span>
    </div>

    <div class="flex flex-col gap-2">
        <span class="text-sm font-medium text-stone-200">Expires on</span>
        <Input type="date" bind:value={expiresOn} min={minDate} max={maxDate} />
        <span class="text-xs text-stone-400">
            {#if expiresOn}
                Stops working after {new Date(expiresOn).toLocaleDateString(undefined, { dateStyle: "long" })}.
            {:else}
                Leave empty and the key never expires.
            {/if}
        </span>
    </div>

    <div class="flex flex-col gap-2">
        <LevelSlider levels={levelOptions} bind:value={level} label="Access level" disabled={creating}>
            {#snippet trailing(scope)}
                {#if SCOPE_LABELS[scope as JpaPermission]?.writes}
                    <Badge variant="orange" content="writes" icon={TablerPencil} />
                {/if}
            {/snippet}
        </LevelSlider>

        <div class="flex flex-col items-start gap-2 rounded-lg border-2 border-stone-700/50 bg-stone-900 p-4">
            <Badge variant={SCOPE_LABELS[level].variant} icon={SCOPE_LABELS[level].icon} content={SCOPE_LABELS[level].label} />
            <span class="text-xs text-stone-400">{SCOPE_LABELS[level].description}</span>
        </div>
        {#if grantsWrites}
            <div
                transition:slide={{ duration: 200 }}
                class="flex items-start gap-2 rounded-lg border-2 border-yellow-700/50 bg-yellow-900 p-2 text-xs text-yellow-200"
            >
                <TablerAlertTriangle class="mt-0.5 size-4 shrink-0" />
                <span>This key will be able to change data, not just read it. Treat it like a password.</span>
            </div>
        {/if}
    </div>

    <div class="flex gap-2">
        <Button class="w-full gap-2" disabled={creating || !name.trim()} onclick={submit}>
            {#if creating}
                <SvgSpinnersRingResize class="size-5" />
                Creating…
            {:else}
                <TablerPlus class="size-5" />
                Create Key
            {/if}
        </Button>
        <Button variant="ghost" class="w-full gap-2" disabled={creating} onclick={onCancel}>
            <TablerX class="size-5" />
            Cancel
        </Button>
    </div>
</div>
