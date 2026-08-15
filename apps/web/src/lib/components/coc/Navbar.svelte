<script lang="ts">
    import { page } from "$app/state";
    import { authClient, hasPermission } from "$lib/auth";
    import { ROLE_CONFIG, type Role } from "$lib/config/roles";
    import { cn } from "$lib/utils";
    import { NAV_LINKS as links } from "$lib/utils/links";
    import TablerMenu2 from "~icons/tabler/menu-2";
    import Avatar from "../ui/Avatar.svelte";
    import CocBtn from "../ui/coc/CocBtn.svelte";
    import CocPopup from "../ui/coc/CocPopup.svelte";
    import Link from "../ui/Link.svelte";

    let scrollY = $state(0);
    let mobileMenuOpen = $state(false);

    const session = authClient.useSession();

    const isHomePage = $derived(page.url.pathname === "/");
    const isScrolled = $derived(scrollY > 20);
</script>

<svelte:window bind:scrollY />

<nav
    class={cn(
        "fixed top-0 z-40 flex h-20 w-full items-center justify-between p-4 font-coc transition-all duration-200 md:p-6",
        (!isHomePage || isScrolled) && "bg-stone-950/50 backdrop-blur-sm",
    )}
>
    <a href="/" class="flex h-12 items-center gap-4">
        <div class="size-12 animate-wavy-bounce bg-contain bg-center bg-no-repeat" style="background-image: url('/logo.webp');"></div>
        <div class="h-full border-l-2 border-stone-700/50"></div>
        <div class="flex flex-col">
            <span class="text-xl font-bold">JPA</span>
            <span class="text-xs text-stone-400">FWA Clans</span>
        </div>
    </a>

    <div class="hidden **:text-sm md:absolute md:left-1/2 md:flex md:-translate-x-1/2 md:items-center md:gap-8">
        {#each links as link, i (link.href)}
            <Link href={link.href} class="stagger-up" style="--i:{i}">
                {link.name}
            </Link>
        {/each}
    </div>

    <div class="flex items-center gap-3">
        <CocPopup bind:open={mobileMenuOpen} title="Menu" placement="bottom-end" aboveNavbar={true} class="md:hidden">
            {#snippet trigger()}
                <TablerMenu2
                    class="press size-8 cursor-pointer text-stone-50 drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)] transition-transform duration-200"
                />
            {/snippet}
            <div class="flex flex-col gap-3">
                {#each links as link (link.href)}
                    <CocBtn
                        href={link.href}
                        variant="orange"
                        size="sm"
                        class={cn("w-full", page.url.pathname === link.href && "outline outline-offset-2 outline-white/70")}
                        onclick={() => (mobileMenuOpen = false)}
                    >
                        {link.name}
                    </CocBtn>
                {/each}
            </div>
        </CocPopup>

        {#if $session.isPending}
            <div class="size-12 animate-pulse rounded-full bg-stone-700/50"></div>
        {:else if $session.data?.user}
            {@const user = $session.data.user}
            {@const role = (user.role ?? null) as Role | null}
            <CocPopup placement="bottom-end" aboveNavbar={true}>
                {#snippet trigger()}
                    <Avatar src={user.image} name={user.name} {role} size="md" />
                {/snippet}
                <div class="flex min-w-52 flex-col gap-4">
                    <div class="flex items-center gap-3">
                        <Avatar src={user.image} name={user.name} {role} size="lg" />
                        <div class="flex flex-col gap-0.5">
                            <span class="font-coc font-bold">{user.name}</span>
                            {#if role && role in ROLE_CONFIG}
                                <span class="font-coc text-sm text-stone-700">
                                    {ROLE_CONFIG[role].label}
                                </span>
                            {/if}
                        </div>
                    </div>
                    <div class="flex flex-col gap-2">
                        <CocBtn variant="orange" size="sm" href="/dashboard">Dashboard</CocBtn>
                        {#await hasPermission(user.id, "review") then canAdmin}
                            {#if canAdmin}
                                <CocBtn variant="orange" size="sm" href="/admin">Admin</CocBtn>
                            {/if}
                        {/await}
                        <CocBtn variant="red" size="sm" onclick={() => authClient.signOut()}>Logout</CocBtn>
                    </div>
                </div>
            </CocPopup>
        {:else}
            <CocBtn variant="blurple" onclick={() => authClient.signIn.social({ provider: "discord", callbackURL: window.location.origin })}>
                Login
            </CocBtn>
        {/if}
    </div>
</nav>
