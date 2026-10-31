<script lang="ts">
    import { actionConfig, actorOf, describe, fieldLabel, type AuditEntry, type AuditResolver } from "#lib/config/auditLog.js";
    import { formatDateTime } from "#lib/utils.js";
    import TablerArrowRight from "~icons/tabler/arrow-right";
    import TablerKey from "~icons/tabler/key";
    import TablerMask from "~icons/tabler/mask";
    import TablerSettings from "~icons/tabler/settings";
    import AuditActorAvatar from "./AuditActorAvatar.svelte";
    import AuditChanges from "./AuditChanges.svelte";
    import AuditFlow from "./AuditFlow.svelte";
    import AuditMention from "./AuditMention.svelte";
    import AuditSentence from "./AuditSentence.svelte";
    import AuditTextDiff from "./AuditTextDiff.svelte";
    import AuditValueView from "./AuditValueView.svelte";

    export type AuditFilterRequest = { involvingUserId?: string; targetType?: string; targetId?: string; q?: string };

    let {
        entry,
        resolver,
        onFilter,
        onManageUser,
    }: {
        entry: AuditEntry;
        resolver: AuditResolver;
        onFilter: (filter: AuditFilterRequest, label: string) => void;
        onManageUser?: (userId: string) => void;
    } = $props();

    const cfg = $derived(actionConfig(entry.action));
    const actor = $derived(actorOf(entry, resolver));
    // Stopping an impersonation runs inside the impersonated session, so there the impersonator is the actor.
    const impersonatorId = $derived(
        entry.context?.impersonatorId && entry.context.impersonatorId !== entry.actorId ? entry.context.impersonatorId : null,
    );
    const meta = $derived((entry.metadata ?? {}) as Record<string, unknown>);
    const hunks = $derived(
        Array.isArray(meta.hunks)
            ? (meta.hunks as { oldStart: number; oldLines: number; newStart: number; newLines: number; lines: string[] }[])
            : null,
    );
    const itemsTotal = $derived(typeof meta.itemsTotal === "number" ? meta.itemsTotal : (entry.items?.length ?? 0));
</script>

{#snippet sectionTitle(title: string, extra?: string)}
    <div class="flex items-center justify-between text-xs font-medium text-stone-400">
        <span>{title}</span>
        {#if extra}<span class="text-stone-500">{extra}</span>{/if}
    </div>
{/snippet}

<div class="flex size-full flex-col">
    <div class="mb-5 flex items-start gap-3 pr-10">
        <AuditActorAvatar {entry} {resolver} size="md" ringClass="ring-stone-900" />
        <div class="flex min-w-0 flex-col gap-1">
            <p class="text-sm leading-6 text-stone-300">
                {#if actor}
                    <AuditMention entity={{ type: "user", id: entry.actorId }} {resolver} />
                {:else}
                    <span class="font-semibold text-stone-50">System</span>
                {/if}
                <AuditSentence segments={describe(entry)} {resolver} />
            </p>
            <span class="text-xs text-stone-500">{formatDateTime(entry.createdAt)}</span>
        </div>
    </div>

    {#if entry.source === "api" || impersonatorId}
        <div class="mb-5 flex flex-col gap-1.5 text-xs text-stone-400">
            {#if entry.source === "api"}
                <span class="flex items-center gap-1.5">
                    <TablerKey class="size-3.5 shrink-0 text-purple-400" />
                    <span>Done through the API key <span class="font-semibold text-stone-200">{entry.apiKeyName ?? "unnamed"}</span></span>
                </span>
            {/if}
            {#if impersonatorId}
                <span class="flex items-center gap-1.5">
                    <TablerMask class="size-3.5 shrink-0 text-orange-400" />
                    <span>
                        Done while <AuditMention entity={{ type: "user", id: impersonatorId }} {resolver} /> was impersonating
                    </span>
                </span>
            {/if}
        </div>
    {/if}

    <div class="-mx-1 flex-1 scrollbar-none space-y-6 overflow-y-auto px-1 pb-4 [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        {#if entry.changes?.length}
            <div class="space-y-2">
                {@render sectionTitle("What changed")}
                <div class="rounded-lg bg-stone-800/50 px-3 py-2.5">
                    <AuditChanges changes={entry.changes} {resolver} />
                </div>
            </div>
        {/if}

        <div class="space-y-2">
            {@render sectionTitle("Who and what")}
            {#key entry.id}
                <AuditFlow
                    {entry}
                    {resolver}
                    onPick={(e, name) =>
                        e.type === "user" && e.id ? onFilter({ involvingUserId: e.id }, name) : e.id && onFilter({ q: e.id }, name)}
                />
            {/key}
            {#if onManageUser && entry.actorId && !resolver.user(entry.actorId).ghost}
                <button
                    type="button"
                    class="flex cursor-pointer items-center gap-1.5 text-xs text-stone-400 transition-colors duration-200 hover:text-stone-100"
                    onclick={() => onManageUser(entry.actorId!)}
                >
                    <TablerSettings class="size-3.5" /> Manage {resolver.user(entry.actorId).name}
                </button>
            {/if}
        </div>

        {#if hunks?.length}
            <div class="space-y-2">
                {@render sectionTitle("Text changes", `${meta.linesAdded ?? 0} added, ${meta.linesRemoved ?? 0} removed`)}
                <AuditTextDiff {hunks} truncated={meta.truncated === true} />
            </div>
        {/if}

        {#if entry.items?.length}
            <div class="space-y-2">
                {@render sectionTitle(
                    "Affected",
                    itemsTotal > entry.items.length ? `first ${entry.items.length} of ${itemsTotal.toLocaleString()}` : String(itemsTotal),
                )}
                <div class="flex flex-col divide-y divide-stone-800 rounded-lg bg-stone-800/50 px-3">
                    {#each entry.items as item, i (i)}
                        <div class="flex flex-col gap-0.5 py-2 text-sm">
                            <div class="text-stone-300">
                                <AuditMention entity={item.entity} {resolver} />
                                {#if item.owner}
                                    <span class="text-stone-500">·</span>
                                    <span class="text-xs"><AuditMention entity={item.owner} {resolver} /></span>
                                {/if}
                            </div>
                            {#each item.changes ?? [] as c (c.field)}
                                <div class="flex flex-wrap items-center gap-x-1.5 text-xs">
                                    <span class="text-stone-500">{fieldLabel(c.field)}</span>
                                    {#if "before" in c}
                                        <AuditValueView field={c.field} value={c.before} {resolver} muted />
                                        {#if "after" in c}<TablerArrowRight class="size-3 text-stone-500" />{/if}
                                    {/if}
                                    {#if "after" in c}<AuditValueView field={c.field} value={c.after} {resolver} />{/if}
                                </div>
                            {/each}
                        </div>
                    {/each}
                </div>
            </div>
        {/if}

        <p class="text-xs text-stone-500">{cfg.label}</p>
    </div>
</div>
