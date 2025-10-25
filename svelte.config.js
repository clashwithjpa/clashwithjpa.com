import adapter from "@sveltejs/adapter-cloudflare";
import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";

const config = {
    preprocess: [vitePreprocess()],
    kit: {
        adapter: adapter({
            routes: {
                include: ["/*"],
                exclude: ["<all>"]
            }
        }),
        experimental: {
            remoteFunctions: true
        }
    },
    extensions: [".svelte", ".md"],
    compilerOptions: {
        experimental: {
            async: true
        }
    },
    vitePlugin: {
        inspector: true
    }
};

export default config;