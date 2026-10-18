<script lang="ts">
    import { afterNavigate } from "$app/navigation";
    import { page } from "$app/state";
    import { clearIdentifiedUser } from "$lib/analytics";
    import { authClient, hasPermission } from "$lib/auth";
    import { ROLE_CONFIG, type Role } from "$lib/config/roles";
    import { cn } from "$lib/utils";
    import { NAV_LINKS as links } from "$lib/utils/links";
    import SimpleIconsDiscord from "~icons/simple-icons/discord";
    import TablerMenu2 from "~icons/tabler/menu-2";
    import Avatar from "../ui/Avatar.svelte";
    import CocBtn from "../ui/coc/CocBtn.svelte";
    import CocPopup from "../ui/coc/CocPopup.svelte";
    import Link from "../ui/Link.svelte";

    let scrollY = $state(0);
    let menuOpen = $state(false);
    let accountOpen = $state(false);
    let canAdmin = $state(false);

    const session = authClient.useSession();
    const user = $derived($session.data?.user ?? null);
    const role = $derived((user?.role ?? null) as Role | null);

    const isHomePage = $derived(page.url.pathname === "/");
    const isScrolled = $derived(scrollY > 20);

    $effect(() => {
        const id = user?.id;
        canAdmin = false;
        if (id) hasPermission(id, "review").then((ok) => (canAdmin = ok));
    });

    afterNavigate(() => {
        menuOpen = false;
        accountOpen = false;
    });

    const isActive = (href: string) => (href === "/" ? page.url.pathname === "/" : page.url.pathname.startsWith(href));
    const login = () => authClient.signIn.social({ provider: "discord", callbackURL: window.location.href });
    function logout() {
        clearIdentifiedUser();
        authClient.signOut();
        menuOpen = accountOpen = false;
    }
</script>

<svelte:window bind:scrollY />

<!-- Labels and inset panels match ClanCard so the menus read as part of the same parchment UI. -->
{#snippet label(text: string)}
    <h4 class="font-coc text-sm font-bold text-stone-800 uppercase">{text}</h4>
{/snippet}

{#snippet profile()}
    {#if user}
        <div class="flex items-center gap-4 rounded-lg bg-stone-900/10 p-3 inset-shadow-sm shadow-stone-900">
            <Avatar src={user.image} name={user.name} {role} size="md" />
            <div class="flex min-w-0 flex-col">
                <span class="truncate text-lg leading-tight font-bold text-stone-900">{user.name}</span>
                {#if role && role in ROLE_CONFIG}
                    <span class="text-sm text-stone-700">{ROLE_CONFIG[role].label}</span>
                {/if}
            </div>
        </div>
    {/if}
{/snippet}

{#snippet account()}
    {#if user}
        <div class={cn("grid gap-2", canAdmin && "grid-cols-2")}>
            <CocBtn variant={isActive("/dashboard") ? "green" : "orange"} size="sm" href="/dashboard" class="w-full">Dashboard</CocBtn>
            {#if canAdmin}
                <CocBtn variant="orange" size="sm" href="/admin" class="w-full">Admin</CocBtn>
            {/if}
        </div>
        <CocBtn variant="red" size="sm" class="w-full" onclick={logout}>Log out</CocBtn>
    {/if}
{/snippet}

<nav
    class={cn(
        "fixed top-0 z-40 flex h-20 w-full items-center justify-between p-4 font-coc transition-all duration-200 md:p-6",
        (!isHomePage || isScrolled) && "bg-stone-950/50 backdrop-blur-sm",
    )}
>
    <a href="/" class="flex h-12 items-center gap-4">
        <div class="size-12 bg-contain bg-center bg-no-repeat" style="background-image: url('/logo.webp');"></div>
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

    <!-- Phones get one menu for both the site links and the account, opened from the avatar like on desktop. -->
    <div class="md:hidden">
        {#if $session.isPending}
            <div class="size-12 rounded-full bg-stone-700/50"></div>
        {:else}
            <CocPopup bind:open={menuOpen} title="Menu" contentClass="flex flex-col gap-4 p-4 font-coc">
                {#snippet trigger()}
                    {#if user}
                        <Avatar src={user.image} name={user.name} {role} size="md" />
                    {:else}
                        <span
                            class="grid size-11 place-items-center rounded-full border border-white/15 bg-stone-950/50 text-stone-50 backdrop-blur-sm"
                            aria-label="Open menu"
                        >
                            <TablerMenu2 class="size-6" />
                        </span>
                    {/if}
                {/snippet}
                {@render profile()}
                {#if !user}
                    <CocBtn variant="blurple" size="sm" class="w-full" onclick={login}><SimpleIconsDiscord /> Log in with Discord</CocBtn>
                {/if}
                <div class="flex flex-col gap-2">
                    {@render label("Explore")}
                    <div class="grid grid-cols-2 gap-2">
                        {#each links as link (link.href)}
                            <CocBtn size="sm" variant={isActive(link.href) ? "green" : "orange"} href={link.href} class="w-full whitespace-nowrap">
                                {link.name}
                            </CocBtn>
                        {/each}
                    </div>
                </div>
                {#if user}
                    <div class="flex flex-col gap-2">
                        {@render label("Account")}
                        {@render account()}
                    </div>
                {/if}
            </CocPopup>
        {/if}
    </div>

    <div class="hidden items-center gap-4 md:flex">
        {#if $session.isPending}
            <div class="size-12 rounded-full bg-stone-700/50"></div>
        {:else if user}
            <CocPopup
                bind:open={accountOpen}
                title="Account"
                placement="bottom-end"
                aboveNavbar={true}
                maxWidth="w-72"
                contentClass="flex flex-col gap-4 p-4 font-coc"
            >
                {#snippet trigger()}
                    <Avatar src={user.image} name={user.name} {role} size="md" />
                {/snippet}
                {@render profile()}
                <div class="flex flex-col gap-2">
                    {@render account()}
                </div>
            </CocPopup>
        {:else}
            <CocBtn variant="blurple" onclick={login}>Login</CocBtn>
        {/if}
    </div>
</nav>
