import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import satori from "satori";
import sharp from "sharp";
import type { RequestHandler } from "./$types";

export const prerender = true;

const W = 1200;
const H = 630;

const asset = (path: string) => readFile(resolve("static", path));

const el = (type: string, style: Record<string, unknown>, children?: unknown) => ({ type, props: { style, children } });

export const GET: RequestHandler = async () => {
    const [bg, logo, bold] = await Promise.all([asset("bg.webp"), asset("logo.webp"), asset("fonts/clash-bold.otf")]);
    const logoPng = await sharp(logo).resize(132).png().toBuffer();

    const outline = (px: number) => ({ WebkitTextStroke: `${px}px #000`, textShadow: `0 ${px + 2}px 0 #000` });
    const overlay = await satori(
        el(
            "div",
            {
                width: W,
                height: H,
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                padding: "0 72px",
                backgroundImage: "linear-gradient(90deg, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.5) 42%, rgba(0,0,0,0) 72%)",
                fontFamily: "COC",
                color: "#fff",
            },
            [
                { type: "img", props: { src: `data:image/png;base64,${logoPng.toString("base64")}`, width: 132, height: 132 } },
                el("div", { fontSize: 86, marginTop: 18, ...outline(5) }, "Clash With JPA"),
                el("div", { fontSize: 34, marginTop: 10, ...outline(3) }, "FWA clans · 50v50 wars · CWL every season"),
            ],
        ) as never,
        { width: W, height: H, fonts: [{ name: "COC", data: bold, weight: 700, style: "normal" }] },
    );

    const jpeg = await sharp(bg)
        .resize(W, H, { fit: "cover" })
        .composite([{ input: Buffer.from(overlay) }])
        .jpeg({ quality: 86, progressive: true, mozjpeg: true })
        .toBuffer();

    return new Response(new Uint8Array(jpeg), { headers: { "Content-Type": "image/jpeg" } });
};
