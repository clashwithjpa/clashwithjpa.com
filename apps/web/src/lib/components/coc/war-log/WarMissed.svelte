<script lang="ts">
    import CocBtn from "$lib/components/ui/coc/CocBtn.svelte";
    import TownHall from "$lib/components/ui/TownHall.svelte";
    import { toast } from "$lib/toast";
    import { formatCountdown, isActive, missedAttacks, type WarDetail } from "./warLog";

    let { war, now }: { war: WarDetail; now: number } = $props();

    const ended = $derived(!isActive(war.state));

    const groups = $derived.by(() => {
        const byLeft = new Map<number, WarDetail["clan"]["members"]>();
        for (const m of war.clan.members) {
            const left = war.attacksPerMember - m.attacks;
            if (left <= 0) continue;
            byLeft.set(left, [...(byLeft.get(left) ?? []), m]);
        }
        return [...byLeft].sort((a, b) => b[0] - a[0]);
    });
    const total = $derived(groups.reduce((n, [left, list]) => n + left * list.length, 0));

    async function copy() {
        const head = `${war.clan.name} vs ${war.opponent.name}`;
        const when = ended ? "War ended" : `War ends in ${formatCountdown(Date.parse(war.endTime) - now)}`;
        const lines = groups.flatMap(([left, list]) => [
            "",
            ended ? `${left} missed attack${left === 1 ? "" : "s"}` : `${left} attack${left === 1 ? "" : "s"} left`,
            ...list.map((m) => `${m.pos}. ${m.name} (TH${m.th})`),
        ]);
        try {
            await navigator.clipboard.writeText([`${head} · ${when}`, ...lines].join("\n"));
            toast.success("List copied");
        } catch {
            toast.error("Couldn't copy the list");
        }
    }
</script>

<div class="flex flex-col gap-3">
    <div class="flex flex-wrap items-center justify-between gap-2">
        <p class="font-coc text-sm text-parchment/80">
            {#if !war.hasDetail}
                <b class="text-white">{missedAttacks({ ...war, clanAttacks: war.clan.attacks })}</b> attacks were missed. Who missed them wasn't recorded
                for this war.
            {:else if !total}
                {ended
                    ? "Every attack was used. Clean sheet."
                    : war.state === "preparation"
                      ? "Battle day hasn't started."
                      : "Everyone has attacked."}
            {:else}
                <b class="text-white">{total}</b>
                {ended ? `attack${total === 1 ? " was" : "s were"} missed` : `attack${total === 1 ? "" : "s"} still in hand`}
            {/if}
        </p>
        {#if total && war.state !== "preparation"}
            <CocBtn variant="orange" size="xs" onclick={copy}>Copy list</CocBtn>
        {/if}
    </div>

    {#if war.state !== "preparation"}
        <div class="grid grid-cols-1 gap-3 md:grid-cols-2">
            {#each groups as [left, list] (left)}
                <section class="flex flex-col gap-1.5 rounded-xl p-3 coc-slot">
                    <h3 class="font-coc text-xs font-bold tracking-wider text-parchment/70 uppercase">
                        {ended ? `${left} missed` : `${left} left`} · {list.length}
                    </h3>
                    <ul class="flex flex-col gap-1">
                        {#each list as m (m.tag)}
                            <li class="flex min-w-0 items-center gap-2 font-coc text-sm">
                                <span class="w-6 shrink-0 text-right text-parchment/60 tabular-nums">{m.pos}.</span>
                                <TownHall level={m.th} class="size-5" />
                                <span class="truncate font-bold text-white text-outline">{m.name}</span>
                            </li>
                        {/each}
                    </ul>
                </section>
            {/each}
        </div>
    {/if}
</div>
