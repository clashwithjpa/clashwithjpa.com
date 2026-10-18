<script lang="ts">
    import { goto } from "$app/navigation";
    import { page } from "$app/state";
    import { authClient } from "$lib/auth";
    import Input from "$lib/components/ui/Input.svelte";
    import { cn } from "$lib/utils";
    import { NAV_LINKS } from "$lib/utils/links";
    import { island } from "../island.svelte";

    type Target = { name: string; group: string; href: string; external?: boolean };
    type DataLink = { name: string; href: string; requiredPerm?: string; requiredFeature?: string };
    type LayoutData = {
        dashboardLinks?: DataLink[];
        adminLinks?: DataLink[];
        permissions?: Record<string, boolean>;
        features?: Record<string, boolean>;
    };

    const session = authClient.useSession();
    let query = $state("");

    // Admin and dashboard links only exist in the (auth) layout data, which also
    // carries the permissions that decide which of them this user can open.
    let pages = $derived.by(() => {
        const data = page.data as LayoutData;
        const allowed = (links: DataLink[] = []) =>
            links.filter(
                (l) =>
                    l.href !== "/" &&
                    (!l.requiredPerm || data.permissions?.[l.requiredPerm]) &&
                    (!l.requiredFeature || data.features?.[l.requiredFeature]),
            );
        const targets: Target[] = NAV_LINKS.map((l) => ({ ...l, group: "Site" }));
        if (data.dashboardLinks) targets.push(...allowed(data.dashboardLinks).map((l) => ({ name: l.name, href: l.href, group: "Dashboard" })));
        else if ($session.data?.user) targets.push({ name: "Home", href: "/dashboard", group: "Dashboard" });
        targets.push(...allowed(data.adminLinks).map((l) => ({ name: l.name, href: l.href, group: "Admin" })));
        return targets;
    });

    // Player and clan tags only use these characters.
    const TAG = /^#?[0289PYLQGRJCUV]{3,12}$/i;
    const inGame = (action: "OpenPlayerProfile" | "OpenClanProfile", tag: string) =>
        `https://link.clashofclans.com/en?action=${action}&tag=${encodeURIComponent(tag)}`;

    let results = $derived.by<Target[]>(() => {
        const q = query.trim();
        if (TAG.test(q)) {
            const tag = q.replace(/^#/, "").toUpperCase();
            return [
                { name: `Open player #${tag}`, group: "In game", href: inGame("OpenPlayerProfile", tag), external: true },
                { name: `Open clan #${tag}`, group: "In game", href: inGame("OpenClanProfile", tag), external: true },
            ];
        }
        const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
        return pages.filter((p) => terms.every((t) => `${p.group} ${p.name}`.toLowerCase().includes(t))).slice(0, 6);
    });

    function open(target: Target | undefined) {
        if (!target) return;
        island.expanded = false;
        query = "";
        if (target.external) window.open(target.href, "_blank", "noopener");
        else goto(target.href);
    }
</script>

<div class="flex flex-col gap-2">
    <Input placeholder="Page name or #TAG" bind:value={query} onkeydown={(e: KeyboardEvent) => e.key === "Enter" && open(results[0])} />
    <ul class="flex flex-col">
        {#each results as target, i (target.href)}
            <li>
                <button
                    type="button"
                    class={cn(
                        "flex w-full cursor-pointer items-center justify-between gap-4 rounded-lg px-2 py-1.5 text-left text-sm text-stone-200 transition-colors hover:bg-stone-800",
                        i === 0 && query.trim() && "bg-stone-800/60",
                    )}
                    onclick={() => open(target)}
                >
                    <span class="truncate">{target.name}</span>
                    <span class="shrink-0 text-xs text-stone-500">{target.group}</span>
                </button>
            </li>
        {:else}
            <li class="px-2 py-1.5 text-sm text-stone-500">No matches</li>
        {/each}
    </ul>
</div>
