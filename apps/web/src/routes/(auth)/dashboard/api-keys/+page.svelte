<script lang="ts">
    import { PUBLIC_SERVER_URL } from "$env/static/public";
    import { authClient } from "$lib/auth";
    import ApiKeyCard from "$lib/components/ApiKeyCard.svelte";
    import ApiKeyCreateSidebar from "$lib/components/ApiKeyCreateSidebar.svelte";
    import ApiKeyStatsSidebar from "$lib/components/ApiKeyStatsSidebar.svelte";
    import Button from "$lib/components/ui/Button.svelte";
    import Dialog from "$lib/components/ui/Dialog.svelte";
    import Seo from "$lib/components/ui/Seo.svelte";
    import Tooltip from "$lib/components/ui/Tooltip.svelte";
    import { Sidebar } from "$lib/components/ui/sidebar";
    import { SELECTABLE_SCOPES, type ApiKeyRow } from "$lib/config/apiKeys";
    import { formatRelativeTime } from "$lib/utils";
    import { type JpaPermission } from "@repo/auth-shared";
    import { createApiKey, type CreateApiKey200, type CreateApiKey403 } from "@repo/clashofclans-client";
    import { toast } from "svelte-sonner";
    import SvgSpinnersBlocksScale from "~icons/svg-spinners/blocks-scale";
    import TablerActivity from "~icons/tabler/activity";
    import TablerAlertTriangle from "~icons/tabler/alert-triangle";
    import TablerBook2 from "~icons/tabler/book-2";
    import TablerCheck from "~icons/tabler/check";
    import TablerClock from "~icons/tabler/clock";
    import TablerCopy from "~icons/tabler/copy";
    import TablerExternalLink from "~icons/tabler/external-link";
    import TablerKey from "~icons/tabler/key";
    import TablerPlus from "~icons/tabler/plus";
    import TablerShieldLock from "~icons/tabler/shield-lock";

    let { data } = $props();

    const MAX_KEYS = 5;
    // The generated client types only the 200 body, but returns whatever the
    // server sent — a refusal arrives as a value, not a throw.
    type CreateApiKeyResult = CreateApiKey200 | CreateApiKey403;
    const SAMPLE_URL = `${PUBLIC_SERVER_URL}/coc/jpa/clans`;
    const SAMPLE_REQUEST = `curl -H "x-api-key: jpa_****" \\\n  ${SAMPLE_URL}`;
    const SAMPLE_REQUEST_FLAT = `curl -H "x-api-key: jpa_****" ${SAMPLE_URL}`;

    let keys = $state<ApiKeyRow[] | null>(null);
    let loading = $state(true);
    let creating = $state(false);

    // Held only while the reveal dialog is open — nothing persists it.
    let revealedKey = $state<string | null>(null);
    // Bound, not derived from `revealedKey`: `Dialog` writes the prop back when
    // it closes itself, and an unbound value drifts and never reopens.
    let revealOpen = $state(false);
    let copied = $state(false);
    let sampleCopied = $state(false);

    let statsSidebar = $state<Sidebar | null>(null);
    let createSidebar = $state<Sidebar | null>(null);
    let selectedKey = $state<ApiKeyRow | null>(null);

    // The server enforces the same ceiling; this just avoids offering a doomed choice.
    const availableScopes = $derived(SELECTABLE_SCOPES.filter((perm) => data.permissions?.[perm]));
    const atKeyLimit = $derived((keys?.length ?? 0) >= MAX_KEYS);

    const activeCount = $derived((keys ?? []).filter((k) => k.enabled && !(k.expiresAt && new Date(k.expiresAt).getTime() < Date.now())).length);
    const totalRequests = $derived((keys ?? []).reduce((sum, k) => sum + (k.requestCount ?? 0), 0));
    const lastUsed = $derived.by(() => {
        const stamps = (keys ?? []).filter((k) => k.lastRequest).map((k) => new Date(k.lastRequest!).getTime());
        return stamps.length ? new Date(Math.max(...stamps)) : null;
    });

    async function loadKeys() {
        loading = true;
        const { data: list, error } = await authClient.apiKey.list();
        if (error) {
            toast.error("Failed to load API keys", { description: error.message });
            keys = [];
        } else {
            // The plugin returns a paginated envelope, not a bare array.
            keys = (list?.apiKeys ?? []) as unknown as ApiKeyRow[];
        }
        loading = false;
    }

    $effect(() => {
        void loadKeys();
    });

    // Not `authClient.apiKey.create`: scopes are a server-only property on
    // better-auth's route, which refuses them on any call carrying headers —
    // i.e. every call a browser can make. See apps/server/src/routes/api-keys.ts.
    async function handleCreate({ name, scope, expiresIn }: { name: string; scope: JpaPermission; expiresIn?: number }) {
        if (!name) {
            toast.error("Give the key a name so you can identify it later.");
            return;
        }
        creating = true;
        try {
            const resp = (await createApiKey(
                { name, scope, ...(expiresIn ? { expiresIn } : {}) },
                { baseURL: PUBLIC_SERVER_URL, credentials: "include", headers: { "Content-Type": "application/json" } },
            )) as CreateApiKeyResult;

            if (!resp.success) {
                toast.error("Failed to create API key", { description: typeof resp.error === "string" ? resp.error : undefined });
                return;
            }

            createSidebar?.close();
            revealedKey = resp.data.key;
            copied = false;
            revealOpen = true;
            await loadKeys();
        } catch (err) {
            console.error("Create API key error:", err);
            toast.error("Failed to create API key");
        } finally {
            creating = false;
        }
    }

    async function handleRevoke(keyId: string) {
        const { error } = await authClient.apiKey.delete({ keyId });
        if (error) {
            toast.error("Failed to revoke API key", { description: error.message });
            return;
        }
        toast.success("API key revoked");
        if (selectedKey?.id === keyId) {
            statsSidebar?.close();
            selectedKey = null;
        }
        await loadKeys();
    }

    function openStats(apiKey: ApiKeyRow) {
        selectedKey = apiKey;
        statsSidebar?.open(apiKey.id);
    }

    async function copyKey() {
        if (!revealedKey) return;
        await navigator.clipboard.writeText(revealedKey);
        copied = true;
        toast.success("API key copied to clipboard");
        setTimeout(() => {
            copied = false;
        }, 2000);
    }

    async function copySample() {
        await navigator.clipboard.writeText(SAMPLE_REQUEST_FLAT);
        sampleCopied = true;
        setTimeout(() => {
            sampleCopied = false;
        }, 2000);
    }

    function dismissReveal() {
        revealOpen = false;
        revealedKey = null;
        copied = false;
    }
</script>

<Seo title="API Keys" />

<div class="flex flex-col gap-6">
    <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div class="flex min-w-0 flex-col gap-1">
            <h1 class="text-4xl font-bold">API Keys</h1>
            <p class="max-w-prose text-sm text-stone-400">
                Authenticate scripts and bots with an <code class="text-stone-200">x-api-key</code> header. Each key is limited to the access level you
                give it, and can never do more than your own account can.
            </p>
        </div>

        <div class="flex shrink-0 items-center gap-2">
            <Button variant="ghost" size="sm" class="gap-2" href={PUBLIC_SERVER_URL} target="_blank">
                <TablerBook2 class="size-5" />
                API Docs
                <TablerExternalLink class="size-4" />
            </Button>
            {#if keys && keys.length > 0}
                <Tooltip title="{activeCount} active" placement="bottom">
                    <div
                        class="flex cursor-help items-center gap-2 rounded-lg border-2 border-stone-700/50 bg-stone-900 px-4 py-2 text-sm text-stone-400"
                    >
                        <TablerKey class="size-5 shrink-0" />
                        <span class="text-stone-200">{keys.length}</span>
                        <span>/ {MAX_KEYS}</span>
                    </div>
                </Tooltip>
                <Button
                    class="gap-2"
                    disabled={atKeyLimit}
                    tooltip={atKeyLimit ? "Revoke a key before creating another" : ""}
                    tooltipPlacement="bottom"
                    onclick={() => createSidebar?.open("create")}
                >
                    <TablerPlus class="size-5 shrink-0" />
                    New Key
                </Button>
            {/if}
        </div>
    </div>

    {#snippet stat(label: string, value: string, hint: string, Icon: typeof TablerKey)}
        <div class="flex items-center gap-4 rounded-lg border-2 border-stone-700/50 bg-stone-900 p-4">
            <div class="rounded-lg bg-stone-800 p-2">
                <Icon class="size-5 text-stone-400" />
            </div>
            <div class="flex min-w-0 flex-col">
                <span class="text-xs font-medium text-stone-400">{label}</span>
                <span class="truncate text-xl font-bold text-stone-50">{value}</span>
                <span class="truncate text-xs text-stone-400">{hint}</span>
            </div>
        </div>
    {/snippet}

    {#if loading}
        <div class="flex items-center justify-start gap-2 text-2xl font-bold text-stone-400">
            <SvgSpinnersBlocksScale />
            <span>API Keys</span>
        </div>
    {:else if !keys || keys.length === 0}
        <div
            class="stagger-card flex flex-col items-center justify-center gap-4 rounded-lg border-2 border-dashed border-stone-700/50 bg-stone-900/50 px-6 py-10 text-center"
        >
            <div class="rounded-full bg-stone-800 p-3">
                <TablerKey class="size-7 text-stone-400" />
            </div>
            <div class="flex flex-col gap-1">
                <span class="text-lg font-semibold text-stone-50">No API keys yet</span>
                <span class="max-w-md text-sm text-stone-400">
                    Create one to call the API from a script, a bot, or anything else that can't sign in with Discord.
                </span>
            </div>
            <Button class="gap-2" onclick={() => createSidebar?.open("create")}>
                <TablerPlus class="size-5" />
                Create your first key
            </Button>
        </div>
    {:else}
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div class="stagger-card" style="--i:0">
                {@render stat("Requests", totalRequests.toLocaleString(), "across all keys, all time", TablerActivity)}
            </div>
            <div class="stagger-card" style="--i:1">
                {@render stat(
                    "Last used",
                    lastUsed ? formatRelativeTime(lastUsed) : "Never",
                    lastUsed ? lastUsed.toLocaleDateString() : "no traffic yet",
                    TablerClock,
                )}
            </div>
            <div class="stagger-card" style="--i:2">
                {@render stat("Rate limit", "600 / hr", "per key", TablerShieldLock)}
            </div>
        </div>

        <div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {#each keys as apiKey, i (apiKey.id)}
                <div class="stagger-card" style="--i:{i + 3}">
                    <ApiKeyCard {apiKey} onRevoke={handleRevoke} onViewStats={openStats} />
                </div>
            {/each}
        </div>
    {/if}
</div>

<Dialog
    bind:open={revealOpen}
    title="Copy your API key"
    description="This is the only time this key will be shown. Store it somewhere safe before closing this dialog."
    confirmText="Done"
    cancelText="Close"
    onConfirm={dismissReveal}
    onClose={dismissReveal}
>
    <div class="flex flex-col gap-4">
        <div class="flex items-start gap-2 rounded-lg border-2 border-yellow-700/50 bg-yellow-900 p-4 text-sm text-yellow-200">
            <TablerAlertTriangle class="mt-0.5 size-5 shrink-0" />
            <span>Once you close this, the key cannot be retrieved again. If you lose it, revoke it and create a new one.</span>
        </div>

        <div class="flex items-center gap-2 rounded-lg border-2 border-stone-700/50 bg-stone-900 p-4">
            <code class="min-w-0 flex-1 truncate font-mono text-sm text-stone-50">{revealedKey}</code>
            <Button size="icon" variant={copied ? "success" : "base"} onclick={copyKey}>
                {#if copied}
                    <TablerCheck />
                {:else}
                    <TablerCopy />
                {/if}
            </Button>
        </div>
    </div>
</Dialog>

<Sidebar bind:this={createSidebar}>
    <ApiKeyCreateSidebar {availableScopes} {creating} onCreate={handleCreate} onCancel={() => createSidebar?.close()} />
</Sidebar>

<Sidebar bind:this={statsSidebar}>
    {#if selectedKey}
        <ApiKeyStatsSidebar apiKey={selectedKey} />
    {/if}
</Sidebar>
