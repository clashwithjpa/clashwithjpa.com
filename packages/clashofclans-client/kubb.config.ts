import { defineConfig } from "@kubb/core";
import { pluginOas } from "@kubb/plugin-oas";
import { pluginTs } from "@kubb/plugin-ts";
import { pluginSvelteQuery } from "@kubb/plugin-svelte-query";
import { pluginZod } from "@kubb/plugin-zod";

export default defineConfig({
    root: ".",
    input: {
        path: "http://localhost:3000/openapi.json",
    },
    output: {
        path: "./src/gen",
        clean: true,
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
    ],
});
