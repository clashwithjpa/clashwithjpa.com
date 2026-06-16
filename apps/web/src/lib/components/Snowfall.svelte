<script lang="ts">
    import { storage } from "$lib/utils/storage.svelte";

    const GLYPHS = ["❄", "❅", "❆"];

    const flakes = Array.from({ length: 60 }, () => {
        const isFlake = Math.random() < 0.5;
        return {
            isFlake,
            glyph: GLYPHS[Math.floor(Math.random() * GLYPHS.length)],
            left: Math.random() * 100,
            size: isFlake ? 8 + Math.random() * 12 : 4 + Math.random() * 7,
            duration: 6 + Math.random() * 9,
            delay: Math.random() * 12,
            drift: (Math.random() - 0.5) * 80,
            spin: (Math.random() - 0.5) * 720,
            opacity: 0.4 + Math.random() * 0.6,
        };
    });
</script>

{#if storage.snowfall}
    <div class="pointer-events-none fixed inset-0 z-9999 overflow-hidden" aria-hidden="true">
        {#each flakes as flake, i (i)}
            {#if flake.isFlake}
                <span
                    class="snowflake absolute -top-4 leading-none text-stone-50 select-none [text-shadow:0_0_4px_rgba(255,255,255,0.4)]"
                    style="left: {flake.left}%; font-size: {flake.size}px; opacity: {flake.opacity}; --drift: {flake.drift}px; --spin: {flake.spin}deg; animation-duration: {flake.duration}s; animation-delay: -{flake.delay}s;"
                    >{flake.glyph}</span
                >
            {:else}
                <span
                    class="snowflake absolute -top-4 rounded-full bg-stone-50 blur-[0.5px]"
                    style="left: {flake.left}%; width: {flake.size}px; height: {flake.size}px; opacity: {flake.opacity}; --drift: {flake.drift}px; --spin: 0deg; animation-duration: {flake.duration}s; animation-delay: -{flake.delay}s;"
                ></span>
            {/if}
        {/each}
    </div>
{/if}

<style>
    @keyframes snow-fall {
        0% {
            transform: translate3d(0, -10vh, 0) rotate(0deg);
        }
        100% {
            transform: translate3d(var(--drift), 110vh, 0) rotate(var(--spin));
        }
    }

    .snowflake {
        animation-name: snow-fall;
        animation-timing-function: linear;
        animation-iteration-count: infinite;
        will-change: transform;
    }

    @media (prefers-reduced-motion: reduce) {
        .snowflake {
            animation: none;
            display: none;
        }
    }
</style>
