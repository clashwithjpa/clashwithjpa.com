import { parserTs } from "@kubb/parser-ts";
import { pluginFetch } from "@kubb/plugin-fetch";
import { pluginTs } from "@kubb/plugin-ts";
import { pluginZod } from "@kubb/plugin-zod";
import { defineConfig } from "kubb/config";

export default defineConfig({
    input: "http://localhost:3000/openapi.json",
    output: {
        path: "./src/gen",
        clean: true,
        barrel: { type: "named" },
        postGenerate: ["prettier --write ./src/gen"],
    },
    // Vite's dev SSR loads this injected workspace package through Node, whose ESM resolver
    // needs explicit `.ts` extensions on relative imports.
    parsers: [parserTs({ extension: { ".ts": ".ts" } })],
    plugins: [
        pluginTs({
            output: { path: "models" },
        }),
        pluginZod({
            output: { path: "zod" },
        }),
        // The API answers every failure with a `{ success: false, error }` body and a non-2xx
        // status, so return those as values for callers to branch on instead of throwing.
        pluginFetch({
            throwOnErrorDefault: false,
        }),
    ],
});
