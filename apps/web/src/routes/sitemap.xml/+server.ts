import type { RequestHandler } from "./$types";

// Built once at prerender, so `url.origin` is the configured site origin (`paths.origin` in vite.config.ts).
export const prerender = true;

const PAGES = [
    { path: "/", changefreq: "daily", priority: "1.0" },
    { path: "/clans", changefreq: "daily", priority: "0.9" },
    { path: "/wars", changefreq: "hourly", priority: "0.8" },
    { path: "/rules", changefreq: "monthly", priority: "0.6" },
    { path: "/privacy", changefreq: "yearly", priority: "0.3" },
];

export const GET: RequestHandler = ({ url }) => {
    const lastmod = new Date().toISOString().slice(0, 10);
    const urls = PAGES.map(
        (p) =>
            `<url><loc>${url.origin}${p.path}</loc><lastmod>${lastmod}</lastmod><changefreq>${p.changefreq}</changefreq><priority>${p.priority}</priority></url>`,
    ).join("");
    const xml = `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`;
    return new Response(xml, { headers: { "Content-Type": "application/xml" } });
};
