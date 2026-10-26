<script lang="ts">
    import { clearIdentifiedUser } from "#lib/analytics.js";
    import { authClient, hasPermission, signInWithDiscord } from "#lib/auth.js";
    import { ROLE_CONFIG, type Role } from "#lib/config/roles.js";
    import { cn } from "#lib/utils.js";
    import { NAV_LINKS as links } from "#lib/utils/links.js";
    import { afterNavigate } from "$app/navigation";
    import { page } from "$app/state";
    import SimpleIconsDiscord from "~icons/simple-icons/discord";
    import Avatar from "../ui/Avatar.svelte";
    import CocBtn from "../ui/coc/CocBtn.svelte";
    import CocPopup from "../ui/coc/CocPopup.svelte";
    import CocTabs from "../ui/coc/CocTabs.svelte";

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

    afterNavigate(({ shallow }) => {
        if (shallow) return;
        menuOpen = false;
        accountOpen = false;
    });

    const isActive = (href: string) => (href === "/" ? page.url.pathname === "/" : page.url.pathname.startsWith(href));
    const navOptions = links.map((l) => ({ key: l.href, label: l.name, href: l.href }));
    const activeHref = $derived(links.find((l) => isActive(l.href))?.href);
    // The homepage hero art runs under the bar, so the wood only comes in once you scroll.
    const showBar = $derived(!isHomePage || isScrolled);
    const login = () => signInWithDiscord();
    function logout() {
        clearIdentifiedUser();
        authClient.signOut();
        menuOpen = accountOpen = false;
    }
</script>

<svelte:window bind:scrollY />

{#snippet label(text: string)}
    <h4 class="font-coc text-xs font-bold tracking-[0.18em] text-parchment/70 uppercase">{text}</h4>
{/snippet}

{#snippet profile()}
    {#if user}
        <div class="flex items-center gap-4 rounded-xl p-3 coc-slot">
            <Avatar src={user.image} name={user.name} {role} size="md" />
            <div class="flex min-w-0 flex-col">
                <span class="truncate text-lg leading-tight font-bold text-white text-outline">{user.name}</span>
                {#if role && role in ROLE_CONFIG}
                    <span class="text-sm text-parchment/75">{ROLE_CONFIG[role].label}</span>
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

<nav class="fixed top-0 z-40 flex h-20 w-full items-center justify-between p-4 font-coc md:p-6">
    <!-- The shadow lives on the wrapper because the mask on the wood would clip it. -->
    <div
        class={cn(
            "bar-shadow pointer-events-none absolute inset-x-0 top-0 -z-10 h-[calc(100%+1.25rem)] transition-opacity duration-300",
            showBar ? "opacity-100" : "opacity-0",
        )}
        aria-hidden="true"
    >
        <div class="plank-bottom size-full coc-wood"></div>
    </div>

    <a href="/" class="flex h-12 items-center gap-4">
        <div
            class="size-12 bg-contain bg-center bg-no-repeat drop-shadow-[0_2px_2px_rgba(0,0,0,0.5)]"
            style="background-image: url('/logo.webp');"
        ></div>
        <div class="h-full border-l-2 border-black/40"></div>
        <div class="flex flex-col">
            <span class="text-xl leading-tight font-black text-white text-outline">JPA</span>
            <span class="text-xs text-parchment/75">FWA Clans</span>
        </div>
    </a>

    <div class="hidden md:absolute md:left-1/2 md:block md:-translate-x-1/2">
        <CocTabs label="Site" options={navOptions} value={activeHref} />
    </div>

    <!-- Phones get one menu for both the site links and the account, opened from the avatar like on desktop. -->
    <div class="md:hidden">
        {#if $session.isPending}
            <div class="size-12 animate-pulse rounded-full bg-black/25"></div>
        {:else}
            <CocPopup bind:open={menuOpen} contentClass="flex flex-col gap-4 p-4 font-coc">
                {#snippet trigger()}
                    {#if user}
                        <Avatar src={user.image} name={user.name} {role} size="md" />
                    {:else}
                        <!-- The game's own HUD button face (Supercell fan kit) with outlined bars like its HUD glyphs. -->
                        <span
                            class="flex size-12 flex-col items-center justify-center gap-[5px] bg-[url('/icons/hud-button.webp')] bg-contain bg-no-repeat transition-[filter] duration-200 hover:brightness-110 active:brightness-95"
                        >
                            <span class="sr-only">Open menu</span>
                            {#each [0, 1, 2] as bar (bar)}
                                <span class="h-1 w-6 rounded-full bg-white shadow-[0_0_0_1.5px_#000,0_2px_0_1.5px_#000]"></span>
                            {/each}
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
            <div class="size-12 animate-pulse rounded-full bg-black/25"></div>
        {:else if user}
            <CocPopup
                bind:open={accountOpen}
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

<style>
    .bar-shadow {
        filter: drop-shadow(0 2px 0 #1a0f0a) drop-shadow(0 8px 12px rgba(0, 0, 0, 0.45));
    }
</style>
