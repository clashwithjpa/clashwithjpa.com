<script lang="ts">
    import { authClient } from "$lib/auth";
    import { fadeUp, wavyBounce } from "$lib/utils/animations";
    import CocBtn from "../ui/coc/CocBtn.svelte";
    import Link from "../ui/Link.svelte";
    import Popup from "../ui/Popup.svelte";

    let links: { name: string; href: string }[] = [
        { name: "Home", href: "/" },
        { name: "Clans", href: "/clans" },
        { name: "War Details", href: "/wars" },
        { name: "Rules", href: "/rules" },
    ];

    let logo: HTMLElement;

    const session = authClient.useSession();

    $effect(() => {
        fadeUp(document.querySelectorAll(".animate-desktop"));
        wavyBounce(logo);
    });

    const roleLabels: Record<string, string> = {
        admin: "Admin",
        manager: "Manager",
        reviewer: "Reviewer",
        verified: "Verified",
        unverified: "Member",
    };
</script>

<nav class="sticky top-0 z-40 flex items-center justify-between p-4 font-coc transition-all duration-200 md:p-6">
    <a href="/" class="flex h-10 items-center gap-4">
        <div class="size-10 bg-cover" style="background-image: url('/logo.webp');" bind:this={logo}></div>
        <div class="h-full border-l-2 border-stone-700/50"></div>
        <div class="flex flex-col">
            <span class="text-xl font-bold">JPA</span>
            <span class="text-xs text-stone-400">FWA Clans</span>
        </div>
    </a>

    <!-- Desktop nav links -->
    <div class="hidden **:text-sm md:absolute md:left-1/2 md:flex md:-translate-x-1/2 md:items-center md:gap-8">
        {#each links as link}
            <Link href={link.href} class="animate-desktop opacity-0">
                {link.name}
            </Link>
        {/each}
    </div>

    {#if $session.isPending}
        <div class="h-9 w-20 animate-pulse rounded-xl bg-stone-700/50 md:h-10 md:w-24"></div>
    {:else if $session.data?.user}
        <Popup placement="bottom-end">
            {#snippet trigger()}
                <img
                    src={$session.data!.user.image ?? `https://api.dicebear.com/9.x/initials/svg?seed=${$session.data!.user.name}`}
                    alt={$session.data!.user.name}
                    class="size-9 rounded-full border-2 border-stone-600 object-cover"
                />
            {/snippet}
            {#snippet children()}
                <div class="flex min-w-48 flex-col gap-3">
                    <div class="flex flex-col gap-0.5">
                        <span class="font-coc text-sm font-bold text-white">{$session.data!.user.name}</span>
                        {#if $session.data!.user.role}
                            <span class="text-xs text-stone-400">
                                {roleLabels[$session.data!.user.role] ?? $session.data!.user.role}
                            </span>
                        {/if}
                    </div>
                    <div class="h-px bg-stone-700/50"></div>
                    <CocBtn variant="red" size="xs" onclick={() => authClient.signOut()}>Logout</CocBtn>
                </div>
            {/snippet}
        </Popup>
    {:else}
        <CocBtn variant="blurple" size="xs" onclick={() => authClient.signIn.social({ provider: "discord", callbackURL: window.location.origin })}>
            Login
        </CocBtn>
    {/if}
</nav>
