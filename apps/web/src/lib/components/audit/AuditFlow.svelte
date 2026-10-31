<script lang="ts">
    import Avatar from "#lib/components/ui/Avatar.svelte";
    import RoleBadge from "#lib/components/ui/RoleBadge.svelte";
    import TownHall from "#lib/components/ui/TownHall.svelte";
    import {
        actionConfig,
        VARIANT_TEXT,
        VARIANT_TILE,
        type AuditEntity,
        type AuditEntry,
        type AuditResolver,
        type ResolvedEntity,
    } from "#lib/config/auditLog.js";
    import { cn } from "#lib/utils.js";
    import { animate, stagger, svg } from "animejs";
    import { onDestroy, tick } from "svelte";
    import TablerCalendar from "~icons/tabler/calendar";
    import TablerHash from "~icons/tabler/hash";
    import TablerKey from "~icons/tabler/key";
    import TablerListDetails from "~icons/tabler/list-details";
    import TablerRobot from "~icons/tabler/robot";
    import TablerShieldHalf from "~icons/tabler/shield-half";
    import TablerSwords from "~icons/tabler/swords";
    import TablerUser from "~icons/tabler/user";

    let {
        entry,
        resolver,
        onPick,
    }: {
        entry: AuditEntry;
        resolver: AuditResolver;
        // A node was clicked: show everything about that user or thing.
        onPick: (entity: AuditEntity, name: string) => void;
    } = $props();

    type FlowNode = { key: string; label: string; entity: AuditEntity | null; resolved: ResolvedEntity | null };

    const cfg = $derived(actionConfig(entry.action));
    const impersonatorId = $derived(
        entry.context?.impersonatorId && entry.context.impersonatorId !== entry.actorId ? entry.context.impersonatorId : null,
    );

    const RELATION_LABEL: Record<string, string> = {
        target: "Affected",
        applicant: "Applicant",
        account: "Account",
        owner: "Owner",
        member: "Member",
        season: "Season",
        leader: "Leader",
        "assigned clan": "Assigned clan",
    };

    const node = (key: string, label: string, entity: AuditEntity | null, fallback?: string | null): FlowNode => ({
        key,
        label,
        entity,
        resolved: entity ? resolver.entity(entity, fallback) : null,
    });

    // What fed into the actor: the key they used, or whoever was impersonating them.
    const sources = $derived.by(() => {
        const out: FlowNode[] = [];
        if (entry.source === "api")
            out.push(node("key", "Through API key", entry.apiKeyId ? { type: "api_key", id: entry.apiKeyId } : null, entry.apiKeyName));
        if (impersonatorId) out.push(node("imp", "Impersonated by", { type: "user", id: impersonatorId }));
        return out;
    });
    const actor = $derived(node("actor", "Did this", entry.actorId ? { type: "user", id: entry.actorId } : null));
    const targets = $derived(
        (entry.subjects ?? [])
            .filter((s) => !(s.type === "user" && s.id && s.id === entry.actorId))
            .map((s, i) => node(`t${i}`, RELATION_LABEL[s.relation ?? ""] ?? s.relation ?? "", s)),
    );
    const itemCount = $derived((entry.metadata?.itemsTotal as number | undefined) ?? entry.items?.length ?? 0);
    const eventSummary = $derived.by(() => {
        const n = entry.changes?.length ?? 0;
        if (n) return `${n} field${n === 1 ? "" : "s"} changed`;
        if (itemCount) return `${itemCount.toLocaleString()} affected`;
        return null;
    });

    const ENTITY_ICONS = {
        clan: TablerShieldHalf,
        cwl_clan: TablerSwords,
        cwl_season: TablerCalendar,
        api_key: TablerKey,
        discord_channel: TablerHash,
        coc_account: TablerUser,
        user: TablerUser,
    } as const;

    // ── Wires ──
    // Nodes lay out in normal flow; wires are measured from them and drawn in an SVG underneath.
    let container = $state<HTMLDivElement | null>(null);
    let svgEl = $state<SVGSVGElement | null>(null);
    const els: Record<string, HTMLElement | undefined> = $state({});
    let size = $state({ w: 0, h: 0 });
    let wires = $state<{ id: string; d: string; from: [number, number]; to: [number, number] }[]>([]);

    // Ports sit on the left edge of each card's header, where Godot puts them.
    const PORT_X = 22;

    function measure() {
        if (!container) return;
        const box = container.getBoundingClientRect();
        const rect = (key: string) => {
            const r = els[key]?.getBoundingClientRect();
            return r ? { x: r.left - box.left, y: r.top - box.top, w: r.width, h: r.height } : null;
        };
        const next: typeof wires = [];
        const vertical = (from: string, to: string) => {
            const a = rect(from);
            const b = rect(to);
            if (!a || !b) return;
            const x = a.x + PORT_X;
            next.push({ id: `${from}-${to}`, d: `M ${x} ${a.y + a.h} L ${x} ${b.y}`, from: [x, a.y + a.h], to: [x, b.y] });
        };
        let prev: string | null = null;
        for (const s of sources) {
            if (prev) vertical(prev, s.key);
            prev = s.key;
        }
        if (prev) vertical(prev, "actor");
        vertical("actor", "event");

        const ev = rect("event");
        if (ev) {
            const x0 = ev.x + PORT_X;
            const y0 = ev.y + ev.h;
            for (const t of [...targets.map((t) => t.key), ...(itemCount && !targets.length ? ["items"] : [])]) {
                const r = rect(t);
                if (!r) continue;
                const x1 = r.x;
                const y1 = r.y + Math.min(r.h / 2, 22);
                // Drop down the trunk, then ease into the card's left port.
                const d = `M ${x0} ${y0} L ${x0} ${y1 - 14} C ${x0} ${y1 - 4}, ${x0 + 6} ${y1}, ${x0 + 16} ${y1} L ${x1} ${y1}`;
                next.push({ id: `event-${t}`, d, from: [x0, y0], to: [x1, y1] });
            }
        }
        size = { w: box.width, h: box.height };
        wires = next;
    }

    // ── Animation ──
    // The draw-in runs once per instance (the sidebar keys this component on the event) and is never
    // reverted: reverting a half-drawn wire leaves it at length zero. Only the pulses restart on resize.
    let intro: ReturnType<typeof animate>[] = [];
    let pulses: ReturnType<typeof animate>[] = [];
    let introPlayed = false;

    async function play() {
        await tick();
        for (const a of pulses) a.revert();
        pulses = [];
        if (!svgEl) return;
        const paths = Array.from(svgEl.querySelectorAll<SVGPathElement>("path[data-wire]"));
        if (paths.length === 0 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

        if (!introPlayed) {
            introPlayed = true;
            intro.push(animate(svg.createDrawable(paths), { draw: ["0 0", "0 1"], duration: 500, delay: stagger(110), ease: "outQuad" }));
            const nodes = container ? Array.from(container.querySelectorAll<HTMLElement>("[data-node]")) : [];
            intro.push(animate(nodes, { opacity: [0, 1], translateY: [6, 0], duration: 350, delay: stagger(80), ease: "outQuad" }));
        }

        // A pulse travels every wire in order, like signal flowing through a node graph.
        Array.from(svgEl.querySelectorAll<SVGCircleElement>("circle[data-pulse]")).forEach((dot, i) => {
            const path = paths[i];
            if (!path) return;
            pulses.push(
                animate(dot, {
                    ...svg.createMotionPath(path),
                    opacity: [0, 1, 1, 0],
                    duration: 1400,
                    delay: 500 + i * 220,
                    loopDelay: 900,
                    loop: true,
                    ease: "inOutSine",
                }),
            );
        });
    }

    $effect(() => {
        entry;
        targets;
        sources;
        if (!container) return;
        let frame = 0;
        const observer = new ResizeObserver(() => {
            cancelAnimationFrame(frame);
            frame = requestAnimationFrame(() => {
                measure();
                play();
            });
        });
        observer.observe(container);
        measure();
        play();
        return () => {
            observer.disconnect();
            cancelAnimationFrame(frame);
        };
    });

    onDestroy(() => {
        for (const a of [...intro, ...pulses]) a.cancel();
    });
</script>

{#snippet entityBody(n: FlowNode)}
    {@const r = n.resolved}
    {#if r?.user}
        {@const u = r.user}
        <Avatar src={u.image} name={u.name} role={u.role} ghost={u.ghost} size="xs" />
        <div class="flex min-w-0 flex-1 flex-col">
            <span class={cn("truncate text-sm font-medium", u.ghost ? "text-stone-400 italic" : "text-stone-100")}>{u.name}</span>
            <span class="truncate font-mono text-[11px] text-stone-500">{u.ghost ? "No longer exists" : (u.discordId ?? "")}</span>
        </div>
        {#if u.role && !u.ghost}
            <RoleBadge role={u.role} class="hidden shrink-0 @xs:flex" />
        {/if}
    {:else if r}
        {@const Icon = ENTITY_ICONS[r.type]}
        {#if r.type === "coc_account" && r.account?.townHall}
            <TownHall level={r.account.townHall} class="size-8 shrink-0" />
        {:else}
            <div class="grid size-8 shrink-0 place-items-center rounded-lg bg-stone-800 text-stone-400"><Icon class="size-4" /></div>
        {/if}
        <div class="flex min-w-0 flex-1 flex-col">
            <span class={cn("truncate text-sm font-medium", r.gone ? "text-stone-400 italic" : "text-stone-100")}>{r.name}</span>
            <span class="truncate text-[11px] text-stone-500">{r.gone && r.type !== "coc_account" ? "No longer exists" : (r.detail ?? "")}</span>
        </div>
    {:else}
        <div class="grid size-8 shrink-0 place-items-center rounded-full bg-stone-800 text-stone-400"><TablerRobot class="size-4" /></div>
        <span class="text-sm font-medium text-stone-100">System</span>
    {/if}
{/snippet}

{#snippet card(n: FlowNode)}
    <button
        type="button"
        data-node
        bind:this={els[n.key]}
        disabled={!n.entity?.id}
        onclick={() => n.entity && n.resolved && onPick(n.entity, n.resolved.name)}
        class="group relative z-10 w-full cursor-pointer overflow-hidden rounded-lg border-2 border-stone-700/50 bg-stone-900 text-left shadow-lg transition-colors duration-200 enabled:hover:border-stone-600 disabled:cursor-default"
    >
        <div
            class="flex items-center gap-1.5 border-b border-stone-800 bg-stone-800/60 px-2.5 py-1 text-[10px] font-medium tracking-wide text-stone-400 uppercase"
        >
            {n.label}
        </div>
        <div class="flex items-center gap-2.5 px-2.5 py-2">
            {@render entityBody(n)}
        </div>
    </button>
{/snippet}

<div bind:this={container} class="@container relative">
    <svg bind:this={svgEl} class="pointer-events-none absolute inset-0 z-0 overflow-visible" width={size.w} height={size.h} aria-hidden="true">
        {#each wires as w (w.id)}
            <path data-wire d={w.d} fill="none" class="stroke-stone-600" stroke-width="2" stroke-linecap="round" />
        {/each}
        {#each wires as w (w.id)}
            <circle
                data-pulse
                r="3.5"
                cx="0"
                cy="0"
                opacity="0"
                class={cn("fill-current", VARIANT_TEXT[cfg.variant])}
                style="filter: drop-shadow(0 0 4px currentColor)"
            />
        {/each}
        <!-- Ports drawn last so the wires tuck under them. -->
        {#each wires as w (w.id)}
            {#each [w.from, w.to] as [cx, cy], i (i)}
                <circle {cx} {cy} r="4" class="fill-stone-900 stroke-stone-500" stroke-width="2" />
            {/each}
        {/each}
    </svg>

    <div class="relative flex flex-col gap-6">
        {#each sources as s (s.key)}
            {@render card(s)}
        {/each}

        {@render card(actor)}

        <div data-node bind:this={els.event} class={cn("relative z-10 overflow-hidden rounded-lg border-2 shadow-lg", VARIANT_TILE[cfg.variant])}>
            <div class="flex items-center gap-2.5 px-2.5 py-2">
                <div class="grid size-8 shrink-0 place-items-center rounded-lg bg-black/25"><cfg.icon class="size-4" /></div>
                <div class="flex min-w-0 flex-col">
                    <span class="truncate text-sm font-semibold">{cfg.label}</span>
                    {#if eventSummary}<span class="truncate text-[11px] opacity-75">{eventSummary}</span>{/if}
                </div>
            </div>
        </div>

        {#if targets.length || itemCount}
            <!-- Indented so the trunk has room to curve into each card. -->
            <div class="-mt-2 flex flex-col gap-3 pl-12">
                {#each targets as t (t.key)}
                    {@render card(t)}
                {/each}
                {#if itemCount && !targets.length}
                    <div
                        data-node
                        bind:this={els.items}
                        class="relative z-10 flex items-center gap-2.5 rounded-lg border-2 border-stone-700/50 bg-stone-900 px-2.5 py-2 shadow-lg"
                    >
                        <div class="grid size-8 shrink-0 place-items-center rounded-lg bg-stone-800 text-stone-400">
                            <TablerListDetails class="size-4" />
                        </div>
                        <span class="text-sm font-medium text-stone-100">{itemCount.toLocaleString()} affected</span>
                    </div>
                {/if}
            </div>
        {/if}
    </div>
</div>
