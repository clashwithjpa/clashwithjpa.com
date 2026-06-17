import adapter from "@sveltejs/adapter-static";
import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";

/** @type {import('@sveltejs/kit').Config} */
const config = {
    kit: {
        adapter: adapter({
            pages: "build",
            assets: "build",
            fallback: "200.html",
            precompress: process.env.CAPACITOR === "true" ? false : true,
            strict: true,
        }),
        prerender: {
            origin: "https://clashwithjpa.com",
        },
    },
    preprocess: vitePreprocess(),
};

export default config;
