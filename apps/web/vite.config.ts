import { sentrySvelteKit } from "@sentry/sveltekit";
import adapter from "@sveltejs/adapter-static";
import { sveltekit } from "@sveltejs/kit/vite";
import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";
import tailwindcss from "@tailwindcss/vite";
import Icons from "unplugin-icons/vite";
import { defineConfig } from "vite";

export default defineConfig({
    plugins: [
        tailwindcss(),
        sentrySvelteKit({
            adapter: "other",
            autoUploadSourceMaps: false,
        }),
        sveltekit({
            adapter: adapter({
                pages: "build",
                assets: "build",
                fallback: "200.html",
                precompress: process.env.CAPACITOR !== "true",
                strict: true,
            }),
            paths: {
                origin: "https://clashwithjpa.com",
            },
            preprocess: vitePreprocess(),
        }),
        Icons({
            compiler: "svelte",
        }),
    ],
    optimizeDeps: {
        exclude: [
            "codemirror",
            "prettier",
            "@codemirror/autocomplete",
            "@codemirror/commands",
            "@codemirror/language",
            "@codemirror/lint",
            "@codemirror/search",
            "@codemirror/state",
            "@codemirror/view",
            "@codemirror/lang-markdown",
            "@uiw/codemirror-themes-all",
        ],
    },
});
