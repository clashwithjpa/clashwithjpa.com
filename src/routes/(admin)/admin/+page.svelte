<script lang="ts">
    import { animate, splitText, stagger } from "animejs";
    import type { APIUser } from "discord-api-types/v10";
    import { onMount } from "svelte";
    import { scale } from "svelte/transition";
    import type { PageData } from "./$types";

    interface Props {
        data?: PageData;
    }

    let { data }: Props = $props();

    let mounted = $state(false);
    let userInfo = $state<APIUser | null>(null);
    let greetingElement: HTMLHeadingElement | undefined = $state();
    let avatarElement: HTMLDivElement | undefined = $state();

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return "Good Morning";
        if (hour < 18) return "Good Afternoon";
        return "Good Evening";
    };

    const greeting = $derived(`${getGreeting()}, ${data?.user.global_name || data?.user.username}!`);

    async function fetchUserInfo(id: string): Promise<APIUser> {
        const resp = await fetch(`/api/user?id=${id}`);
        if (resp.ok) {
            return await resp.json();
        } else {
            throw new Error("Failed to fetch user info");
        }
    }

    function getDefaultAvatarUrl(userId: string): string {
        const index = (BigInt(userId) >> 22n) % 6n;
        return `https://cdn.discordapp.com/embed/avatars/${index}.png`;
    }

    function getAvatarUrl(userId: string, avatarHash: string | null): string {
        if (!avatarHash) {
            return getDefaultAvatarUrl(userId);
        }
        const extension = avatarHash.startsWith("a_") ? "gif" : "png";
        return `https://cdn.discordapp.com/avatars/${userId}/${avatarHash}.${extension}?size=256`;
    }

    onMount(() => {
        mounted = true;

        // Fetch user info for avatar decoration
        if (data?.user.id) {
            fetchUserInfo(data.user.id)
                .then((info) => {
                    userInfo = info;
                })
                .catch(() => {
                    userInfo = null;
                });
        }

        // Avatar wavy bounce animation
        if (avatarElement) {
            animate(avatarElement, {
                opacity: [{ to: [0, 1] }],
                scale: [
                    { to: 0, duration: 0 },
                    { to: 1.15, duration: 400 },
                    { to: 0.95, duration: 200 },
                    { to: 1.05, duration: 150 },
                    { to: 1, duration: 150 }
                ],
                rotate: [
                    { to: 0, duration: 0 },
                    { to: -5, duration: 400 },
                    { to: 3, duration: 200 },
                    { to: -2, duration: 150 },
                    { to: 0, duration: 150 }
                ],
                easing: "out(2)"
            });
        }

        // Text glide animation
        if (greetingElement) {
            const { chars } = splitText(greetingElement, {
                chars: { wrap: "clip" }
            });

            greetingElement.style.opacity = "1";
            chars.forEach((char) => {
                const wrapper = char.parentElement;
                if (!wrapper) return;

                wrapper.style.overflow = "hidden";
                wrapper.style.display = "inline-block";
                wrapper.style.height = "1.25em"; /* gives room for descenders/accents */
                wrapper.style.lineHeight = "1.25em";
                wrapper.style.verticalAlign = "middle";

                const ch = char as HTMLElement;
                ch.style.display = "inline-block";
                ch.style.willChange = "transform, opacity";
            });

            animate(chars, {
                y: [{ to: ["100%", "0%"] }],
                duration: 800,
                ease: "out(3)",
                delay: stagger(50)
            });
        }
    });
</script>

<div class="flex size-full flex-col items-center justify-center gap-8 pb-20">
    <div bind:this={avatarElement} class="avatar-image relative flex size-32 shrink-0 items-center justify-center">
        <div
            class="size-full overflow-hidden rounded-full bg-cover bg-center shadow-2xl"
            style="background-image: url('{getAvatarUrl(data?.user.id ?? '', data?.user.avatar ?? '')}');"
        ></div>

        {#if userInfo?.avatar_decoration_data?.asset}
            <img
                src={`https://cdn.discordapp.com/avatar-decoration-presets/${userInfo.avatar_decoration_data.asset}.png`}
                alt="Avatar Decoration"
                class="pointer-events-none absolute inset-0 z-10 size-full"
                in:scale={{ duration: 300, delay: 100 }}
            />
        {/if}
    </div>

    <h1 bind:this={greetingElement} class="greeting-text text-center text-5xl font-bold">
        {greeting}
    </h1>
</div>

<style>
    .avatar-image,
    .greeting-text {
        opacity: 0;
        white-space: pre;
    }
</style>
