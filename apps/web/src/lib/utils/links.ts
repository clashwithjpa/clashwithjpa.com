interface Links {
    discord?: string;
}

export const LINKS: Links = {
    discord: "https://discord.clashwithjpa.com",
};

// The site's top-level pages, in nav order. Lives here so the navbar is the only
// place that renders them but not the only place that could.
export const NAV_LINKS: { name: string; href: string }[] = [
    { name: "Home", href: "/" },
    { name: "Clans", href: "/clans" },
    { name: "War Details", href: "/wars" },
    { name: "Rules", href: "/rules" },
];
