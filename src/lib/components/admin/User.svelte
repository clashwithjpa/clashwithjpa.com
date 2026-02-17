<script lang="ts">
    import type { APIUser } from "discord-api-types/v10";
    import { fade, scale } from "svelte/transition";

    interface Props {
        userName?: string;
        userID: string;
    }

    let { userName, userID }: Props = $props();

    async function fetchUserInfo(id: string): Promise<APIUser> {
        const resp = await fetch(`/api/user?id=${id}`);
        if (resp.ok) {
            const userInfo = await resp.json();
            return userInfo;
        } else {
            throw new Error("Failed to fetch user info");
        }
    }

    function getDefaultAvatarUrl(userId: string): string {
        // Discord's default avatar logic: (user_id >> 22) % 6
        const index = (BigInt(userId) >> 22n) % 6n;
        return `https://cdn.discordapp.com/embed/avatars/${index}.png`;
    }

    function getAvatarUrl(userId: string, avatarHash: string | null): string {
        if (!avatarHash) {
            return getDefaultAvatarUrl(userId);
        }
        const extension = avatarHash.startsWith("a_") ? "gif" : "png";
        return `https://cdn.discordapp.com/avatars/${userId}/${avatarHash}.${extension}?size=128`;
    }
</script>

<span class="flex w-full shrink-0 items-center justify-start text-sm">
    <a
        href="https://discord.com/users/{userID}"
        target="_blank"
        rel="noopener noreferrer"
        class="bg-blurple/50 hover:bg-blurple group flex shrink-0 items-center justify-start gap-1.5 rounded-md px-1.5 py-0.5 transition-colors duration-150"
    >
        {#await fetchUserInfo(userID)}
            <!-- Loading state -->
            <div class="relative flex size-6 shrink-0 items-center justify-center">
                <div class="bg-blurple size-full animate-pulse rounded-full"></div>
            </div>
            {#if !userName}
                <div class="bg-blurple h-3.5 w-16 shrink-0 animate-pulse rounded"></div>
            {/if}
        {:then userInfo}
            <!-- Avatar container -->
            <div in:fade={{ duration: 200 }} class="relative flex size-6 shrink-0 items-center justify-center">
                <div
                    class="size-full overflow-hidden rounded-full bg-cover bg-center transition-transform duration-300 ease-out group-hover:scale-110"
                    style="background-image: url('{getAvatarUrl(userID, userInfo.avatar)}');"
                ></div>

                {#if userInfo.avatar_decoration_data?.asset}
                    <img
                        src={`https://cdn.discordapp.com/avatar-decoration-presets/${userInfo.avatar_decoration_data?.asset}.png`}
                        alt="Avatar Decoration"
                        class="pointer-events-none absolute inset-0 z-10 size-full transition-transform duration-300 ease-out group-hover:scale-110 group-hover:rotate-3"
                        in:scale={{ duration: 300, delay: 100 }}
                    />
                {/if}
            </div>

            <!-- Username -->
            {#if !userName}
                <div class="flex items-center gap-1">
                    <span class="text-foreground text-sm leading-none font-medium">
                        {userInfo.global_name || userInfo.username}
                    </span>
                    {#if userInfo.global_name}
                        <span class="text-blurple-light font-mono text-xs leading-none">@{userInfo.username}</span>
                    {/if}
                </div>
            {/if}
        {:catch}
            <!-- Error state - show default avatar -->
            <div in:fade={{ duration: 200 }} class="relative flex size-5 shrink-0 items-center justify-center">
                <div
                    class="size-full overflow-hidden rounded-full bg-cover bg-center transition-transform duration-300 ease-out group-hover:scale-110"
                    style="background-image: url('{getDefaultAvatarUrl(userID)}');"
                ></div>
            </div>
            {#if !userName}
                <span class="text-blurple-light text-sm leading-none font-medium">Unknown User</span>
            {/if}
        {/await}

        <!-- Username from props -->
        {#if userName}
            <span class="text-foreground text-sm leading-none font-medium">
                @{userName}
            </span>
        {/if}
    </a>
</span>
