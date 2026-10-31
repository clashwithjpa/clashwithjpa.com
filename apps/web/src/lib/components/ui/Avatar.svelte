<script lang="ts">
    import { ROLE_CONFIG, type Role } from "#lib/config/roles.js";
    import { cn } from "#lib/utils.js";
    import TablerGhost2 from "~icons/tabler/ghost-2";

    let {
        src,
        name,
        role = null,
        size = "md",
        ghost = false,
        class: className = "",
    }: {
        src?: string | null;
        name: string;
        role?: Role | null;
        size?: "2xs" | "xs" | "sm" | "md" | "lg" | "xl" | "2xl" | "3xl";
        // A user who no longer exists: GitHub-style ghost on the default ring.
        ghost?: boolean;
        class?: string;
    } = $props();

    const sizeClass = {
        "2xs": "size-5",
        xs: "size-8",
        sm: "size-10",
        md: "size-12",
        lg: "size-16",
        xl: "size-20",
        "2xl": "size-24",
        "3xl": "size-32",
    } as const;

    const config = $derived(!ghost && role && role in ROLE_CONFIG ? ROLE_CONFIG[role] : null);
    const imgSrc = $derived(src ?? `https://api.dicebear.com/9.x/identicon/svg?seed=${encodeURIComponent(name)}`);
</script>

<div class={cn("relative shrink-0", sizeClass[size], className)}>
    {#if config}
        <div
            class={cn("absolute inset-0 rounded-full", config.decoration.animated && "ring-spin")}
            style="background: {config.decoration.gradient};"
        ></div>
    {:else}
        <div class="absolute inset-0 rounded-full border-2 border-stone-700/50"></div>
    {/if}

    <div class="absolute inset-0.5 overflow-hidden rounded-full bg-stone-950">
        {#if ghost}
            <div class="grid size-full place-items-center bg-stone-800 text-stone-400">
                <TablerGhost2 class="size-3/5" />
            </div>
        {:else}
            <div class="size-full bg-cover bg-no-repeat" style="background-image: url({imgSrc});"></div>
        {/if}
    </div>
</div>

<style>
    .ring-spin {
        animation: ringSpin 3s linear infinite;
    }

    @keyframes ringSpin {
        to {
            transform: rotate(360deg);
        }
    }
</style>
