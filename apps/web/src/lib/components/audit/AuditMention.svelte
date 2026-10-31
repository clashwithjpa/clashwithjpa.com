<script lang="ts">
    import Avatar from "#lib/components/ui/Avatar.svelte";
    import HoverCard from "#lib/components/ui/HoverCard.svelte";
    import RoleBadge from "#lib/components/ui/RoleBadge.svelte";
    import TownHall, { townHallUrl } from "#lib/components/ui/TownHall.svelte";
    import type { AuditEntity, AuditResolver } from "#lib/config/auditLog.js";
    import { toast } from "#lib/toast.js";
    import { cn } from "#lib/utils.js";
    import TablerBrandDiscord from "~icons/tabler/brand-discord";
    import TablerCalendar from "~icons/tabler/calendar";
    import TablerCopy from "~icons/tabler/copy";
    import TablerExternalLink from "~icons/tabler/external-link";
    import TablerGhost2 from "~icons/tabler/ghost-2";
    import TablerHash from "~icons/tabler/hash";
    import TablerKey from "~icons/tabler/key";
    import TablerShieldHalf from "~icons/tabler/shield-half";
    import TablerSwords from "~icons/tabler/swords";
    import TablerUser from "~icons/tabler/user";

    let {
        entity,
        resolver,
        fallback = null,
    }: {
        entity: AuditEntity;
        resolver: AuditResolver;
        // Name to show if the entity no longer exists, taken from the event's own diff.
        fallback?: string | null;
    } = $props();

    const resolved = $derived(resolver.entity(entity, fallback));
    const INLINE_ICONS = {
        clan: TablerShieldHalf,
        cwl_clan: TablerSwords,
        cwl_season: TablerCalendar,
        api_key: TablerKey,
        discord_channel: TablerHash,
        coc_account: TablerUser,
        user: TablerUser,
    } as const;
    const InlineIcon = $derived(INLINE_ICONS[resolved.type]);
    const th = $derived(resolved.account?.townHall ?? null);
    let thFailed = $state(false);

    const owner = $derived(resolved.account?.ownerDiscordId ? resolver.user(null, resolved.account.ownerDiscordId) : null);

    async function copy(value: string, label: string) {
        try {
            await navigator.clipboard.writeText(value);
            toast.success(`${label} copied`);
        } catch {
            toast.error("Couldn't copy to clipboard");
        }
    }
</script>

{#snippet copyRow(label: string, value: string | null | undefined)}
    {#if value}
        <button
            type="button"
            class="group flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1 text-left transition-colors duration-200 hover:bg-stone-800"
            onclick={() => copy(value, label)}
        >
            <span class="shrink-0 text-xs text-stone-400">{label}</span>
            <span class="truncate font-mono text-xs text-stone-200">{value}</span>
            <TablerCopy class="size-3 shrink-0 text-stone-500 opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
        </button>
    {/if}
{/snippet}

{#snippet linkButton(href: string, label: string, Icon: typeof TablerExternalLink)}
    <a
        {href}
        target="_blank"
        rel="noopener noreferrer"
        class="flex items-center justify-center gap-1.5 rounded-lg border-2 border-stone-700/50 bg-stone-800 px-3 py-1.5 text-xs text-stone-200 transition-colors duration-200 hover:bg-stone-700"
    >
        <Icon class="size-3.5" />
        {label}
    </a>
{/snippet}

<HoverCard placement="top" maxWidth="max-w-72" class="inline p-0 align-baseline" contentClass="w-64 p-3">
    {#snippet trigger()}
        <!-- Inline elements only: this sits inside the hover card's <button> trigger, mid-sentence. -->
        <span class="whitespace-nowrap"
            >{#if resolved.user && !resolved.user.ghost}<img
                    src={resolved.user.image ?? `https://api.dicebear.com/9.x/identicon/svg?seed=${encodeURIComponent(resolved.user.name)}`}
                    alt=""
                    class="mr-1 inline size-4 rounded-full align-[-3px] ring-1 ring-stone-700"
                    loading="lazy"
                />{:else if resolved.user}<TablerGhost2 class="mr-1 inline size-4 align-[-3px] text-stone-500" />{:else if th && !thFailed}<img
                    src={townHallUrl(th)}
                    alt=""
                    class="mr-0.5 inline size-4.5 object-contain align-[-4px]"
                    loading="lazy"
                    onerror={() => (thFailed = true)}
                />{:else}<InlineIcon class="mr-0.5 inline size-3.5 align-[-2px] text-stone-400" />{/if}<span
                class={cn(
                    "font-semibold text-stone-50 decoration-stone-500 underline-offset-2 hover:underline",
                    resolved.gone && "font-medium text-stone-400 italic",
                )}>{resolved.name}</span
            ></span
        >
    {/snippet}

    <div class="flex flex-col gap-3">
        {#if resolved.user}
            {@const u = resolved.user}
            <div class="flex items-center gap-3">
                <Avatar src={u.image} name={u.name} role={u.role} ghost={u.ghost} size="sm" />
                <div class="flex min-w-0 flex-col gap-0.5">
                    <span class="truncate text-sm font-medium text-stone-100">{u.name}</span>
                    {#if u.ghost}
                        <span class="text-xs text-stone-400">This user no longer exists</span>
                    {:else if u.role}
                        <RoleBadge role={u.role} />
                    {/if}
                </div>
            </div>
            {#if u.discordId}
                <div class="-mx-2">{@render copyRow("Discord ID", u.discordId)}</div>
                {@render linkButton(`https://discord.com/users/${u.discordId}`, "Open in Discord", TablerBrandDiscord)}
            {/if}
        {:else if resolved.type === "coc_account"}
            {@const a = resolved.account}
            <div class="flex items-center gap-3">
                {#if a?.townHall}
                    <TownHall level={a.townHall} class="size-10 shrink-0" />
                {/if}
                <div class="flex min-w-0 flex-col">
                    {#if resolved.id && resolved.name === resolved.id}
                        <!-- No player name on record, so the title is the tag: make it the copy target. -->
                        <button
                            type="button"
                            class="group flex min-w-0 cursor-pointer items-center gap-1.5 text-left"
                            onclick={() => copy(resolved.id!, "Tag")}
                        >
                            <span class="truncate font-mono text-sm font-medium text-stone-100">{resolved.name}</span>
                            <TablerCopy class="size-3 shrink-0 text-stone-500 opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
                        </button>
                    {:else}
                        <span class="truncate text-sm font-medium text-stone-100">{resolved.name}</span>
                    {/if}
                    <span class="text-xs text-stone-400">
                        {a?.townHall ? `Town Hall ${a.townHall}` : "Clash of Clans account"}{a?.linked ? "" : " · no longer linked"}
                    </span>
                </div>
            </div>
            {#if resolved.name !== resolved.id}
                <div class="-mx-2">{@render copyRow("Tag", resolved.id)}</div>
            {/if}
            {#if owner}
                <div class="flex items-center gap-2 text-xs text-stone-400">
                    Owned by
                    <Avatar src={owner.image} name={owner.name} role={owner.role} ghost={owner.ghost} size="2xs" />
                    <span class="truncate font-medium text-stone-200">{owner.name}</span>
                </div>
            {/if}
            {#if resolved.id}
                {@render linkButton(
                    `https://link.clashofclans.com/en/?action=OpenPlayerProfile&tag=${encodeURIComponent(resolved.id)}`,
                    "Open in game",
                    TablerExternalLink,
                )}
            {/if}
        {:else}
            <div class="flex flex-col">
                <span class="truncate text-sm font-medium text-stone-100">{resolved.name}</span>
                <span class="truncate text-xs text-stone-400">{resolved.gone ? "No longer exists" : resolved.detail}</span>
            </div>
            {#if resolved.type === "clan" || resolved.type === "cwl_clan"}
                <div class="-mx-2">{@render copyRow("Tag", resolved.id)}</div>
            {/if}
        {/if}
    </div>
</HoverCard>
