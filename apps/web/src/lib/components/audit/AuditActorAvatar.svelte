<script lang="ts">
    import Avatar from "#lib/components/ui/Avatar.svelte";
    import { actionConfig, actorOf, VARIANT_TILE, type AuditEntry, type AuditResolver } from "#lib/config/auditLog.js";
    import { cn } from "#lib/utils.js";
    import TablerRobot from "~icons/tabler/robot";

    let {
        entry,
        resolver,
        size = "sm",
        // Match the surface behind the avatar so the badge looks cut out of it.
        ringClass = "ring-stone-950",
    }: { entry: AuditEntry; resolver: AuditResolver; size?: "sm" | "md"; ringClass?: string } = $props();

    const cfg = $derived(actionConfig(entry.action));
    const actor = $derived(actorOf(entry, resolver));
</script>

<div class="relative shrink-0">
    {#if actor}
        <Avatar src={actor.image} name={actor.name} role={actor.role} ghost={actor.ghost} {size} />
    {:else}
        <div class={cn("grid place-items-center rounded-full bg-stone-800 text-stone-400", size === "md" ? "size-12" : "size-10")}>
            <TablerRobot class="size-1/2" />
        </div>
    {/if}
    <div
        class={cn(
            "absolute -right-1 -bottom-1 grid place-items-center rounded-full border-2 ring-2",
            ringClass,
            size === "md" ? "size-6" : "size-5",
            VARIANT_TILE[cfg.variant],
        )}
    >
        <cfg.icon class={size === "md" ? "size-3.5" : "size-3"} />
    </div>
</div>
