<script lang="ts">
    import { ROLE_CONFIG, type Role } from "$lib/config/roles";
    import { cn } from "$lib/utils";

    let {
        src,
        name,
        role = null,
        size = "md",
        class: className = "",
    }: {
        src?: string | null;
        name: string;
        role?: Role | null;
        size?: "sm" | "md" | "lg";
        class?: string;
    } = $props();

    const sizeClass = { sm: "size-10", md: "size-12", lg: "size-16" } as const;

    const config = $derived(role && role in ROLE_CONFIG ? ROLE_CONFIG[role] : null);
    const imgSrc = $derived(src ?? `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(name)}`);
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
        <img src={imgSrc} alt={name} class="size-full object-cover" loading="lazy" />
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
