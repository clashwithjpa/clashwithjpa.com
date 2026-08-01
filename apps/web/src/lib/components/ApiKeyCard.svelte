<script lang="ts">
    import Badge from "$lib/components/ui/Badge.svelte";
    import Button from "$lib/components/ui/Button.svelte";
    import ConfirmationDialog from "$lib/components/ui/ConfirmationDialog.svelte";
    import Tooltip from "$lib/components/ui/Tooltip.svelte";
    import { SCOPE_LABELS, keyLevel, maskedKey, scopesUpTo, type ApiKeyRow } from "$lib/config/apiKeys";
    import { formatDateTime, formatRelativeTime } from "$lib/utils";

    import TablerActivity from "~icons/tabler/activity";
    import TablerCalendarPlus from "~icons/tabler/calendar-plus";
    import TablerCalendarX from "~icons/tabler/calendar-x";
    import TablerChartBar from "~icons/tabler/chart-bar";
    import TablerClock from "~icons/tabler/clock";
    import TablerPencil from "~icons/tabler/pencil";
    import TablerTrash from "~icons/tabler/trash";

    let {
        apiKey,
        onRevoke,
        onViewStats,
    }: {
        apiKey: ApiKeyRow;
        onRevoke: (keyId: string) => void | Promise<void>;
        onViewStats: (apiKey: ApiKeyRow) => void;
    } = $props();

    const level = $derived(keyLevel(apiKey));
    const included = $derived(level ? scopesUpTo(level).filter((scope) => scope !== level) : []);
    // Levels below go in the tooltip rather than a second badge, which would
    // compete with the write warning for the same row.
    const levelTooltip = $derived.by(() => {
        if (!level) return "";
        const { description } = SCOPE_LABELS[level];
        if (included.length === 0) return description;
        return `${description} Includes ${included.map((scope) => SCOPE_LABELS[scope].label).join(", ")}.`;
    });
    const isExpired = $derived(!!apiKey.expiresAt && new Date(apiKey.expiresAt).getTime() < Date.now());
    // Almost always the revocation cascade firing when an admin took the owner's
    // API access away, so the badge says that rather than just greying out.
    const isDisabled = $derived(!apiKey.enabled);
</script>

<div class="flex h-full min-h-40 min-w-0 flex-col gap-4 rounded-lg border-2 border-stone-700/50 bg-stone-900 p-4">
    <div class="flex items-start justify-between gap-4">
        <div class="flex min-w-0 flex-col items-start justify-center gap-1">
            <h3 class="truncate text-lg font-semibold">{apiKey.name ?? "Unnamed key"}</h3>
            <span class="block w-full truncate font-mono text-xs text-stone-400">{maskedKey(apiKey)}</span>
        </div>

        {#if isExpired}
            <Badge variant="red" content="Expired" icon={TablerCalendarX} />
        {:else if isDisabled}
            <Tooltip title="Disabled — the owner's API access was revoked" placement="top">
                <Badge variant="red" content="Disabled" />
            </Tooltip>
        {:else}
            <Badge variant="green" content="Active" />
        {/if}
    </div>

    <div class="flex flex-wrap gap-2">
        {#if !level}
            <span class="text-sm text-stone-400">No access level — this key cannot call anything.</span>
        {:else}
            <Tooltip title={levelTooltip} placement="top">
                <Badge variant={SCOPE_LABELS[level].variant} icon={SCOPE_LABELS[level].icon} content={SCOPE_LABELS[level].label} />
            </Tooltip>
            {#if SCOPE_LABELS[level].writes}
                <Tooltip title="This key can change data, not just read it" placement="top">
                    <Badge variant="orange" content="writes" icon={TablerPencil} />
                </Tooltip>
            {/if}
        {/if}
    </div>

    <hr class="border-stone-700/50" />

    <div class="flex flex-col gap-2">
        <div class="flex items-center justify-between gap-2 text-sm text-stone-200">
            <span class="flex items-center gap-1 font-medium text-stone-400">
                <TablerActivity class="size-4" /> Requests
            </span>
            <span>{(apiKey.requestCount ?? 0).toLocaleString()}</span>
        </div>

        <div class="flex items-center justify-between gap-2 text-sm text-stone-200">
            <span class="flex items-center gap-1 font-medium text-stone-400">
                <TablerClock class="size-4" /> Last used
            </span>
            {#if apiKey.lastRequest}
                <Tooltip title={formatDateTime(apiKey.lastRequest)} placement="top">
                    <span class="cursor-help">{formatRelativeTime(apiKey.lastRequest)}</span>
                </Tooltip>
            {:else}
                <span class="text-stone-400">Never</span>
            {/if}
        </div>

        <div class="flex items-center justify-between gap-2 text-sm text-stone-200">
            <span class="flex items-center gap-1 font-medium text-stone-400">
                <TablerCalendarPlus class="size-4" /> Created
            </span>
            <Tooltip title={formatDateTime(apiKey.createdAt)} placement="top">
                <span class="cursor-help">{new Date(apiKey.createdAt).toLocaleDateString()}</span>
            </Tooltip>
        </div>

        {#if apiKey.expiresAt}
            <div class="flex items-center justify-between gap-2 text-sm text-stone-200">
                <span class="flex items-center gap-1 font-medium text-stone-400">
                    <TablerCalendarX class="size-4" /> Expires
                </span>
                <Tooltip title={formatDateTime(apiKey.expiresAt)} placement="top">
                    <span class="cursor-help">{new Date(apiKey.expiresAt).toLocaleDateString()}</span>
                </Tooltip>
            </div>
        {/if}
    </div>

    <div class="mt-auto flex gap-2 pt-2">
        <Button class="w-full gap-2" onclick={() => onViewStats(apiKey)}>
            <TablerChartBar class="size-5" />
            Stats
        </Button>
        <ConfirmationDialog
            title="Revoke API Key"
            class="w-full"
            description="Are you sure you want to revoke this key? Anything using it will stop working immediately. This action cannot be undone."
            onConfirm={() => onRevoke(apiKey.id)}
        >
            <Button variant="danger" class="w-full gap-2">
                <TablerTrash class="size-5" />
                Revoke
            </Button>
        </ConfirmationDialog>
    </div>
</div>
