import { anchor } from "@cartamd/plugin-anchor";
import { code } from "@cartamd/plugin-code";
import { emoji } from "@cartamd/plugin-emoji";
import { Carta } from "carta-md";
import DOMPurify from "isomorphic-dompurify";
import type { BundledTheme, StringLiteralUnion } from "shiki";

type ShikiTheme = StringLiteralUnion<BundledTheme>;

const theme: ShikiTheme = "ayu-dark";

export const carta = new Carta({
    sanitizer: DOMPurify.sanitize,
    extensions: [
        anchor({
            autolink: {
                behavior: "wrap",
            },
        }),
        emoji(),
        code({
            theme,
        }),
    ],
    shikiOptions: {
        themes: [theme],
    },
});
