<script lang="ts">
    import type { PageData } from "./$types";
    import info from "../../../data/info.json";
    import Button from "$lib/components/Button.svelte";

    let { data }: { data: PageData } = $props();
</script>

<main class="flex size-full flex-col items-center justify-center px-5 pb-5 md:px-24 lg:px-32">
    {#if !data.user.inGuild}
        <div class="flex flex-col items-center justify-center">
            <iframe
                class="fixed bottom-5 right-5 hidden h-full pt-28 lg:block"
                title="Discord Widget"
                src="https://discord.com/widget?id={info.guildID}&theme=dark"
                allowtransparency={true}
                frameborder="0"
                sandbox="allow-popups allow-popups-to-escape-sandbox allow-same-origin allow-scripts"
            ></iframe>
            <p class="text-center text-xl font-bold">Join the server to apply</p>
            <Button href="https://discord.clashwithjpa.com" class="mt-5" size="md">Join Server</Button>
        </div>
    {:else}
        <div class="flex items-center justify-center"></div>
    {/if}
</main>
