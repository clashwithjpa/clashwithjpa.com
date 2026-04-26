<script lang="ts" module>
    import TablerCrown from "~icons/tabler/crown";
    import TablerFileText from "~icons/tabler/file-text";
    import TablerQuestionMark from "~icons/tabler/question-mark";
    import TablerRosetteDiscountCheck from "~icons/tabler/rosette-discount-check";
    import TablerTool from "~icons/tabler/tool";

    export const ROLE_DETAILS = {
        unverified: { label: "Unverified", variant: "ghost", icon: TablerQuestionMark },
        verified: { label: "Verified", variant: "green", icon: TablerRosetteDiscountCheck },
        reviewer: { label: "Reviewer", variant: "yellow", icon: TablerFileText },
        manager: { label: "Manager", variant: "blue", icon: TablerTool },
        admin: { label: "Admin", variant: "red", icon: TablerCrown },
    } as const;

    export const roleOptions = Object.entries(ROLE_DETAILS).map(([value, details]) => ({
        label: details.label,
        value,
        icon: details.icon,
        variant: details.variant,
    }));
</script>

<script lang="ts">
    import Badge from "$lib/components/ui/Badge.svelte";
    import type { Role } from "$lib/config/roles";

    let { role, class: className = "" }: { role: Role | string; class?: string } = $props();

    let details = $derived(ROLE_DETAILS[role as keyof typeof ROLE_DETAILS] || ROLE_DETAILS.unverified);
</script>

<Badge variant={details.variant as any} content={details.label} icon={details.icon} class={className} />
