<script lang="ts">
    import Avatar from "$lib/components/ui/Avatar.svelte";
    import Input from "$lib/components/ui/Input.svelte";
    import type { Role } from "$lib/config/roles";
    import { cn } from "$lib/utils";
    import SvgSpinnersRingResize from "~icons/svg-spinners/ring-resize";
    import TablerX from "~icons/tabler/x";
    import Button from "./Button.svelte";
    import RawPopup from "./RawPopup.svelte";

    export type ComboboxUser = {
        id: string;
        name: string;
        discordId?: string | null;
        image?: string | null;
        role?: Role | null;
    };

    let {
        value = $bindable<ComboboxUser | null>(null),
        search,
        placeholder = "Search users…",
        class: className = "",
        disabled = false,
        open = $bindable(false),
    }: {
        value?: ComboboxUser | null;
        search: (query: string) => Promise<ComboboxUser[]>;
        placeholder?: string;
        class?: string;
        disabled?: boolean;
        open?: boolean;
    } = $props();

    let query = $state("");
    let results = $state<ComboboxUser[]>([]);
    let searching = $state(false);
    let highlightedIndex = $state(-1);
    let listRef = $state<HTMLDivElement | null>(null);
    let inputRef = $state<HTMLInputElement | null>(null);

    $effect(() => {
        results;
        highlightedIndex = -1;
    });

    $effect(() => {
        if (open) {
            requestAnimationFrame(() => inputRef?.focus());
        } else {
            query = "";
            results = [];
            searching = false;
        }
    });

    // Debounced search
    $effect(() => {
        const q = query.trim();
        if (!q) {
            results = [];
            searching = false;
            return;
        }
        searching = true;
        const timer = setTimeout(async () => {
            try {
                results = await search(q);
            } catch {
                // keep prior results on transient failure
            } finally {
                searching = false;
            }
        }, 250);
        return () => clearTimeout(timer);
    });

    function selectUser(u: ComboboxUser) {
        value = u;
        open = false;
    }

    function clearValue(e: MouseEvent) {
        e.stopPropagation();
        value = null;
    }

    function scrollHighlightedIntoView(index: number) {
        requestAnimationFrame(() => {
            const item = listRef?.children[index] as HTMLElement | undefined;
            item?.scrollIntoView({ block: "nearest" });
        });
    }

    function onKeydown(e: KeyboardEvent) {
        if (!open) return;
        if (e.key === "ArrowDown") {
            e.preventDefault();
            highlightedIndex = Math.min(highlightedIndex + 1, results.length - 1);
            scrollHighlightedIntoView(highlightedIndex);
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            highlightedIndex = Math.max(highlightedIndex - 1, 0);
            scrollHighlightedIntoView(highlightedIndex);
        } else if (e.key === "Enter") {
            e.preventDefault();
            const target = highlightedIndex >= 0 ? results[highlightedIndex] : results[0];
            if (target) selectUser(target);
        } else if (e.key === "Escape") {
            open = false;
        }
    }
</script>

<RawPopup
    bind:open
    class={cn("relative w-full", className)}
    contentClass="p-2 z-9999"
    maxWidth="w-max min-w-[var(--reference-width)] max-w-[var(--available-width)]"
>
    {#snippet trigger()}
        {#if value && !open}
            <div
                class={cn(
                    "flex w-full items-center justify-between gap-2 rounded-lg border-2 border-stone-700/50 bg-stone-900 px-3 py-2 shadow-xs transition-colors duration-200 ease-in-out",
                    disabled && "cursor-not-allowed opacity-50!",
                )}
            >
                <div class="flex min-w-0 flex-1 items-center gap-2">
                    <Avatar src={value.image ?? null} name={value.name} role={value.role ?? null} size="sm" />
                    <span class="truncate text-sm text-stone-50">{value.name}</span>
                </div>
                <Button onclick={clearValue} variant="ghost" size="icon" {disabled} class="border-none">
                    <TablerX />
                </Button>
            </div>
        {:else}
            <Input
                bind:ref={inputRef}
                value={query}
                oninput={(e) => (query = e.currentTarget.value)}
                onkeydown={onKeydown}
                onpointerdown={(e) => {
                    if (open) e.stopPropagation();
                }}
                {placeholder}
                {disabled}
            />
        {/if}
    {/snippet}

    <div bind:this={listRef} class="flex flex-col gap-1">
        {#if searching && results.length === 0}
            <div class="flex items-center justify-center gap-2 py-4 text-sm text-stone-400">
                <SvgSpinnersRingResize class="size-4" /> Searching…
            </div>
        {:else if results.length === 0}
            <div class="py-4 text-center text-sm text-stone-400">
                {query.trim() ? "No users found." : "Start typing to search users."}
            </div>
        {:else}
            {#each results as u, i (u.id)}
                <button
                    type="button"
                    onclick={() => selectUser(u)}
                    onmouseenter={() => (highlightedIndex = i)}
                    onmouseleave={() => (highlightedIndex = -1)}
                    class={cn(
                        "flex w-full cursor-pointer items-center gap-3 rounded-lg px-2 py-2 text-sm text-stone-200 transition-colors duration-200 ease-in-out outline-none hover:bg-stone-700/50 hover:text-stone-50",
                        value?.id === u.id && "bg-stone-800 text-stone-50",
                        highlightedIndex === i && "bg-stone-700/50 text-stone-50",
                    )}
                >
                    <Avatar src={u.image ?? null} name={u.name} role={u.role ?? null} size="sm" class="shrink-0" />
                    <div class="flex min-w-0 flex-col text-left">
                        <span class="truncate font-medium text-stone-200">{u.name}</span>
                        {#if u.discordId}
                            <span class="truncate font-mono text-xs text-stone-400">{u.discordId}</span>
                        {/if}
                    </div>
                </button>
            {/each}
        {/if}
    </div>
</RawPopup>
