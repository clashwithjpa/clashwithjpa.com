<script lang="ts">
    import type { APIUser } from "discord-api-types/v10";
    import { fade } from "svelte/transition";

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
</script>

<span class="flex w-full shrink-0 items-center justify-start gap-1 text-sm">
    <a
        href="https://discord.com/users/{userID}"
        target="_blank"
        rel="noopener noreferrer"
        class="bg-blurple/50 text-blurple-light hover:bg-blurple hover:text-foreground flex shrink-0 cursor-pointer items-center justify-start gap-1 rounded-md p-0.5 font-sans transition-colors"
    >
        {#await fetchUserInfo(userID)}
            <div class="bg-blurple size-6 shrink-0 animate-pulse rounded-full"></div>
            {#if !userName}
                <div class="bg-blurple h-5 w-20 shrink-0 animate-pulse rounded-md"></div>
            {/if}
        {:then userInfo}
            <div in:fade class="relative flex size-6 w-full items-center justify-center">
                <div
                    class="bg-blurple size-6 rounded-full bg-cover bg-center"
                    style="background-image: url('https://cdn.discordapp.com/avatars/{userID}/{userInfo.avatar}?size=4096');"
                ></div>
                {#if userInfo.avatar_decoration_data?.asset}
                    <img
                        src={`https://cdn.discordapp.com/avatar-decoration-presets/${userInfo.avatar_decoration_data?.asset}`}
                        alt="Avatar Decoration"
                        class="absolute z-10 size-full rounded-full"
                    />
                {/if}
            </div>
            {#if !userName}
                <p>@{userInfo.username}</p>
            {/if}
        {:catch}
            <div class="bg-blurple size-6 shrink-0 rounded-full"></div>
            {#if !userName}
                <p>@{userID}</p>
            {/if}
        {/await}
        {#if userName}
            <p>@{userName}</p>
        {/if}
    </a>
</span>
