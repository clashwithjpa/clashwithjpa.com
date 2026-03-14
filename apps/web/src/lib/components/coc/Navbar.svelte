<script lang="ts">
    import { authClient } from "$lib/auth";
    import { ROLE_CONFIG, type Role } from "$lib/config/roles";
    import { fadeUp, wavyBounce } from "$lib/utils/animations";
    import Avatar from "../ui/Avatar.svelte";
    import CocBtn from "../ui/coc/CocBtn.svelte";
    import CocPopup from "../ui/coc/CocPopup.svelte";
    import Link from "../ui/Link.svelte";

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
</script>

<nav class="sticky top-0 z-40 flex items-center justify-between p-4 font-coc transition-all duration-200 md:p-6">
    <a href="/" class="flex h-12 items-center gap-4">
        <div class="size-12 bg-contain bg-center bg-no-repeat" style="background-image: url('/logo.webp');" bind:this={logo}></div>
        <div class="h-full border-l-2 border-stone-700/50"></div>
        <div class="flex flex-col">
            <span class="text-xl font-bold">JPA</span>
            <span class="text-xs text-stone-400">FWA Clans</span>
        </div>
    </a>

    <div class="hidden **:text-sm md:absolute md:left-1/2 md:flex md:-translate-x-1/2 md:items-center md:gap-8">
        {#each links as link}
            <Link href={link.href} class="animate-desktop opacity-0">
                {link.name}
            </Link>
        {/each}
    </div>

    {#if $session.isPending}
        <div class="size-12 animate-pulse rounded-full bg-stone-700/50"></div>
    {:else if $session.data?.user}
        {@const user = $session.data.user}
        {@const role = (user.role ?? null) as Role | null}
        <CocPopup placement="bottom-end">
            {#snippet trigger()}
                <Avatar src={user.image} name={user.name} {role} size="md" />
            {/snippet}
            {#snippet children()}
                <div class="flex min-w-52 flex-col gap-4">
                    <div class="flex items-center gap-3">
                        <Avatar src={user.image} name={user.name} {role} size="lg" />
                        <div class="flex flex-col gap-0.5">
                            <span class="font-coc font-bold">{user.name}</span>
                            {#if role && role in ROLE_CONFIG}
                                <span class="font-coc text-sm text-stone-600">
                                    {ROLE_CONFIG[role].label}
                                </span>
                            {/if}
                        </div>
                    </div>
                    <div class="flex flex-col gap-2">
                        <CocBtn variant="orange" size="sm" href="/dashboard">Dashboard</CocBtn>
                        {#if !["unverified", "verified"].includes(role ?? "")}
                            <CocBtn variant="orange" size="sm" href="/admin">Admin</CocBtn>
                        {/if}
                        <CocBtn variant="red" size="sm" onclick={() => authClient.signOut()}>Logout</CocBtn>
                    </div>
                </div>
            {/snippet}
        </CocPopup>
    {:else}
        <CocBtn variant="blurple" onclick={() => authClient.signIn.social({ provider: "discord", callbackURL: window.location.origin })}>
            Login
        </CocBtn>
    {/if}
</nav>
