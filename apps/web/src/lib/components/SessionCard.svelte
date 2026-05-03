<script lang="ts">
    import Badge from "$lib/components/ui/Badge.svelte";
    import Button from "$lib/components/ui/Button.svelte";
    import ConfirmationDialog from "$lib/components/ui/ConfirmationDialog.svelte";
    import Tooltip from "$lib/components/ui/Tooltip.svelte";
    import { formatDateTime } from "$lib/utils";
    import { cardSlideIn, fadeIn } from "$lib/utils/animations";
    import { UAParser } from "ua-parser-js";

    import TablerCalendarClock from "~icons/tabler/calendar-clock";
    import TablerCalendarX from "~icons/tabler/calendar-x";
    import TablerClock from "~icons/tabler/clock";
    import TablerDeviceDesktop from "~icons/tabler/device-desktop";
    import TablerDeviceMobile from "~icons/tabler/device-mobile";
    import TablerPointFilled from "~icons/tabler/point-filled";
    import TablerTrash from "~icons/tabler/trash";
    import TablerWorld from "~icons/tabler/world";

    import LogosChrome from "~icons/logos/chrome";
    import LogosFirefox from "~icons/logos/firefox";
    import LogosInternetexplorer from "~icons/logos/internetexplorer";
    import LogosEdge from "~icons/logos/microsoft-edge";
    import LogosOpera from "~icons/logos/opera";
    import LogosSafari from "~icons/logos/safari";
    import LogosVivaldiIcon from "~icons/logos/vivaldi-icon";
    import TablerBrowser from "~icons/tabler/browser";

    let {
        sessionData,
        currentSessionId,
        onRevoke,
    }: {
        sessionData: any;
        currentSessionId?: string;
        onRevoke: (token: string) => void | Promise<void>;
    } = $props();

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
        if (b.includes("edge")) return LogosEdge;
        if (b.includes("opera")) return LogosOpera;
        if (b.includes("safari")) return LogosSafari;
        if (b.includes("vivaldi")) return LogosVivaldiIcon;
        if (b.includes("internet explorer") || b.includes("ie")) return LogosInternetexplorer;
        return TablerBrowser;
    }

    const ua = $derived(parseUserAgent(sessionData.userAgent));
    const isCurrent = $derived(currentSessionId === sessionData.id);
    const BrowserIcon = $derived(getBrowserIcon(ua.browser));
</script>

<div in:fadeIn use:cardSlideIn class="flex min-h-40 min-w-0 flex-col gap-4 rounded-lg border-2 border-stone-700/50 bg-stone-900 p-4">
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
                    <BrowserIcon class="size-6 shrink-0" />
                    <span class="truncate">{ua.browser}</span>
                </h3>
            </div>
            <span class="block w-full truncate font-mono text-xs text-stone-400">
                {sessionData.id}
            </span>
        </div>

        {#if isCurrent}
            <Badge variant="green" content="Current" icon={TablerPointFilled} />
        {/if}
    </div>

    <hr class="border-stone-700/50" />

    <div class="flex flex-col gap-2">
        <div class="flex items-center justify-between gap-2 text-sm text-stone-200">
            <span class="flex items-center gap-1 font-medium text-stone-400">
                <TablerWorld class="size-4" /> IP Address
            </span>
            <span>{sessionData.ipAddress || "Unknown"}</span>
        </div>

        <div class="flex items-center justify-between gap-2 text-sm text-stone-200">
            <span class="flex items-center gap-1 font-medium text-stone-400">
                <TablerCalendarClock class="size-4" /> Created
            </span>
            <Tooltip title={formatDateTime(sessionData.createdAt)} placement="top">
                <span class="cursor-help">
                    {new Date(sessionData.createdAt).toLocaleDateString()}
                </span>
            </Tooltip>
        </div>

        <div class="flex items-center justify-between gap-2 text-sm text-stone-200">
            <span class="flex items-center gap-1 font-medium text-stone-400">
                <TablerCalendarX class="size-4" /> Expires
            </span>
            <Tooltip title={formatDateTime(sessionData.expiresAt)} placement="top">
                <span class="cursor-help">
                    {new Date(sessionData.expiresAt).toLocaleDateString()}
                </span>
            </Tooltip>
        </div>

        <div class="flex items-center justify-between gap-2 text-sm text-stone-200">
            <span class="flex items-center gap-1 font-medium text-stone-400">
                <TablerClock class="size-4" /> Last Updated
            </span>
            <Tooltip title={formatDateTime(sessionData.updatedAt)} placement="top">
                <span class="cursor-help">
                    {new Date(sessionData.updatedAt).toLocaleTimeString()}
                </span>
            </Tooltip>
        </div>
    </div>

    <div class="mt-auto flex pt-2">
        <ConfirmationDialog
            title="Revoke Session"
            class="w-full"
            description="Are you sure you want to revoke this session? This action cannot be undone."
            onConfirm={() => onRevoke(sessionData.token)}
        >
            <Button variant="danger" class="w-full gap-2" disabled={isCurrent}>
                <TablerTrash class="size-5" />
                {isCurrent ? "Logout to remove" : "Revoke Session"}
            </Button>
        </ConfirmationDialog>
    </div>
</div>
