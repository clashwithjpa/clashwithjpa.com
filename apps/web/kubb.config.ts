import { defineConfig } from "@kubb/core";
import { pluginOas } from "@kubb/plugin-oas";
import { pluginTs } from "@kubb/plugin-ts";
import { pluginClient } from "@kubb/plugin-client";
import { pluginSvelteQuery } from "@kubb/plugin-svelte-query";

export default defineConfig({
    root: ".",
    input: {
        path: "http://localhost:3000/openapi.json",
    },
    output: {
        path: "./src/lib/api",
        clean: true,
    },
    plugins: [
        pluginOas(),
        pluginTs({
            output: { path: "models" },
        }),
        pluginClient({
            output: { path: "clients" },
        }),
        pluginSvelteQuery({
            output: { path: "hooks" },
        }),
    ],
});
