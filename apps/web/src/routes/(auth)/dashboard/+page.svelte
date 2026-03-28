<script lang="ts">
    import { authClient } from "$lib/auth";
    import Avatar from "$lib/components/ui/Avatar.svelte";
    import Badge from "$lib/components/ui/Badge.svelte";
    import Seo from "$lib/components/ui/Seo.svelte";
    import Tooltip from "$lib/components/ui/Tooltip.svelte";
    import type { Role } from "$lib/config/roles";
    import { formatDate, formatDateTime } from "$lib/utils";
    import type { Component } from "svelte";
    import TablerCalendarClock from "~icons/tabler/calendar-clock";
    import TablerCrown from "~icons/tabler/crown";
    import TablerFileText from "~icons/tabler/file-text";
    import TablerQuestionMark from "~icons/tabler/question-mark";
    import TablerTool from "~icons/tabler/tool";

    const session = authClient.useSession();

    const roleIcons: Partial<Record<Role, Component>> = {
        unverified: TablerQuestionMark,
        manager: TablerTool,
        reviewer: TablerFileText,
        admin: TablerCrown,
    };
</script>

<Seo title="Dashboard" />

<div class="flex w-full items-center justify-start">
    <div class="flex items-center justify-start gap-4">
        <Avatar
            src={$session.data?.user.image}
            name={$session.data?.user.name || ""}
            role={($session.data?.user.role as Role) || "unverified"}
            size="2xl"
        />
        <div class="flex flex-col gap-2">
            <h1 class="text-4xl font-semibold">{$session.data?.user.name?.split(" ")[0]}</h1>
            <div class="flex items-start justify-center gap-2">
                <Badge
                    variant="ghost"
                    content={$session.data?.user.role ?? "unverified"}
                    icon={roleIcons[($session.data?.user.role as Role) ?? "unverified"]}
                />
                <div class="flex flex-wrap gap-1">
                    <Tooltip title={formatDateTime($session.data?.user.createdAt)} placement="bottom">
                        <Badge variant="green" content={formatDate($session.data?.user.createdAt)} icon={TablerCalendarClock} />
                    </Tooltip>
                </div>
            </div>
        </div>
    </div>
</div>

<hr class="my-6 border-stone-700/50" />

<h1 class="text-2xl font-bold">Linked Accounts</h1>
