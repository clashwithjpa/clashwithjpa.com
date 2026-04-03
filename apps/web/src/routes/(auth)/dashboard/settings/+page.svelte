<script lang="ts">
    import { authClient } from "$lib/auth";
    import Badge from "$lib/components/ui/Badge.svelte";
    import Button from "$lib/components/ui/Button.svelte";
    import Seo from "$lib/components/ui/Seo.svelte";
    import Tooltip from "$lib/components/ui/Tooltip.svelte";
    import { formatDateTime } from "$lib/utils";
    import { cardSlideIn, fadeIn } from "$lib/utils/animations";
    import { UAParser } from "ua-parser-js";
    import SvgSpinnersBlocksScale from "~icons/svg-spinners/blocks-scale";
    import TablerCalendarClock from "~icons/tabler/calendar-clock";
    import TablerCalendarX from "~icons/tabler/calendar-x";
    import TablerClock from "~icons/tabler/clock";
    import TablerDeviceDesktop from "~icons/tabler/device-desktop";
    import TablerDeviceMobile from "~icons/tabler/device-mobile";
    import TablerServer from "~icons/tabler/server";
    import TablerTrash from "~icons/tabler/trash";
    import TablerWorld from "~icons/tabler/world";
    // Browser Icons
    import LogosBrave from "~icons/logos/brave";
    import LogosChrome from "~icons/logos/chrome";
    import LogosFirefox from "~icons/logos/firefox";
    import LogosEdge from "~icons/logos/microsoft-edge";
    import LogosOpera from "~icons/logos/opera";
    import LogosSafari from "~icons/logos/safari";

    let session = authClient.useSession();
    let sessions = authClient.listSessions();

    async function invalidateSession(token: string) {
        await authClient.revokeSession({ token });
        sessions = authClient.listSessions();
    }

    function parseUserAgent(uaString: string | null | undefined) {
        if (!uaString) return { device: "Unknown", os: "Unknown", browser: "Unknown" };
        const parser = new UAParser(uaString);
        return {
            device: parser.getDevice().type === "mobile" ? "Mobile" : "Desktop",
            os: parser.getOS().name || "Unknown OS",
            browser: parser.getBrowser().name || "Unknown Browser",
        };
    }

    function getBrowserIcon(browserName: string) {
        const b = browserName.toLowerCase();
        if (b.includes("chrome")) return LogosChrome;
        if (b.includes("firefox")) return LogosFirefox;
        if (b.includes("safari")) return LogosSafari;
        if (b.includes("edge")) return LogosEdge;
        if (b.includes("opera")) return LogosOpera;
        if (b.includes("brave")) return LogosBrave;
        return null;
    }
</script>

<Seo title="Settings" />

{#await sessions}
    <div in:fadeIn class="flex items-center justify-start gap-2 text-2xl font-bold text-stone-400">
        <SvgSpinnersBlocksScale />
        <span>Active Sessions</span>
    </div>
{:then resp}
    <div in:fadeIn>
        <div class="flex flex-col gap-1">
            <h1 class="text-4xl font-bold">Active Sessions</h1>
            <p class="text-sm text-stone-400">Manage your active sessions across all devices.</p>
        </div>
        <br />
        {#if !resp.data || resp.data.length === 0}
            <div class="flex items-center justify-start gap-1 text-stone-400">
                <TablerServer />
                <span>No active sessions found</span>
            </div>
        {:else}
            <div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {#each resp.data as s (s.id)}
                    {@const ua = parseUserAgent(s.userAgent)}
                    {@const isCurrent = $session.data?.session?.id === s.id}
                    <div
                        in:fadeIn
                        use:cardSlideIn
                        class="flex min-h-40 min-w-0 flex-col gap-4 rounded-lg border-2 border-stone-700/50 bg-stone-900 p-4"
                    >
                        <div class="flex items-start justify-between gap-4">
                            <div class="flex min-w-0 flex-col items-start justify-center gap-1">
                                <div class="flex items-center gap-2">
                                    {#if ua.device === "Mobile"}
                                        <TablerDeviceMobile class="size-6 text-stone-200" />
                                    {:else}
                                        <TablerDeviceDesktop class="size-6 text-stone-200" />
                                    {/if}
                                    <h3 class="flex items-center gap-2 truncate text-lg font-semibold">
                                        {ua.os} <span class="select-none"> • </span>
                                        {#if getBrowserIcon(ua.browser)}
                                            {@const BrowserIcon = getBrowserIcon(ua.browser)}
                                            <BrowserIcon class="size-6 shrink-0" />
                                        {/if}
                                        <span class="truncate">{ua.browser}</span>
                                    </h3>
                                </div>
                                <span class="block w-full truncate font-mono text-xs text-stone-400">
                                    {s.id}
                                </span>
                            </div>
                            {#if isCurrent}
                                <Badge variant="green" content="Current" />
                            {/if}
                        </div>

                        <hr class="border-stone-700/50" />

                        <div class="flex flex-col gap-2">
                            <div class="flex items-center justify-between gap-2 text-sm text-stone-200">
                                <span class="flex items-center gap-1 font-medium text-stone-400">
                                    <TablerWorld class="size-4" /> IP Address
                                </span>
                                <span>{s.ipAddress || "Unknown"}</span>
                            </div>
                            <div class="flex items-center justify-between gap-2 text-sm text-stone-200">
                                <span class="flex items-center gap-1 font-medium text-stone-400">
                                    <TablerCalendarClock class="size-4" /> Created
                                </span>
                                <Tooltip title={formatDateTime(s.createdAt)} placement="top">
                                    <span class="u cursor-help">
                                        {new Date(s.createdAt).toLocaleDateString()}
                                    </span>
                                </Tooltip>
                            </div>
                            <div class="flex items-center justify-between gap-2 text-sm text-stone-200">
                                <span class="flex items-center gap-1 font-medium text-stone-400">
                                    <TablerCalendarX class="size-4" /> Expires
                                </span>
                                <Tooltip title={formatDateTime(s.expiresAt)} placement="top">
                                    <span class="cursor-help">
                                        {new Date(s.expiresAt).toLocaleDateString()}
                                    </span>
                                </Tooltip>
                            </div>
                            <div class="flex items-center justify-between gap-2 text-sm text-stone-200">
                                <span class="flex items-center gap-1 font-medium text-stone-400">
                                    <TablerClock class="size-4" /> Last Updated
                                </span>
                                <Tooltip title={formatDateTime(s.updatedAt)} placement="top">
                                    <span class="cursor-help">
                                        {new Date(s.updatedAt).toLocaleTimeString()}
                                    </span>
                                </Tooltip>
                            </div>
                        </div>

                        <div class="mt-auto flex pt-2">
                            <Button variant="danger" class="w-full gap-2" size="sm" onclick={() => invalidateSession(s.token)} disabled={isCurrent}>
                                <TablerTrash class="size-4" />
                                {isCurrent ? "Cannot Remove Current Session" : "Remove Session"}
                            </Button>
                        </div>
                    </div>
                {/each}
            </div>
        {/if}
    </div>
{/await}
