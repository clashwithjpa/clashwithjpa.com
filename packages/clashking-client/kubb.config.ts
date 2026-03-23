import { defineConfig } from "@kubb/core";
import { pluginClient } from "@kubb/plugin-client";
import { pluginOas } from "@kubb/plugin-oas";
import { pluginSvelteQuery } from "@kubb/plugin-svelte-query";
import { pluginTs } from "@kubb/plugin-ts";
import { pluginZod } from "@kubb/plugin-zod";

export default defineConfig({
    root: ".",
    input: {
        path: "https://api.clashk.ing/openapi.json",
    },
    output: {
        path: "./src/gen",
        clean: true,
    },
    hooks: {
        done: ["prettier --write ./src/gen"],
    },
    plugins: [
        pluginOas(),
        pluginTs({
            output: { path: "models" },
        }),
        pluginSvelteQuery({
            output: { path: "hooks" },
        }),
        pluginZod({
            output: { path: "zod" },
        }),
        pluginClient({
            client: "fetch",
        }),
    ],
});
