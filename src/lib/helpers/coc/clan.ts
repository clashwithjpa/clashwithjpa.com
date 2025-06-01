import type { APIClan, APIClanMember, APIClanWar } from "$lib/coc/types";

// Clan check func
export async function checkClan(baseURI: string, apiToken: string, tag: string) {
    const resp = await fetch(`${baseURI}/v1/clans/${encodeURIComponent(tag)}`, {
        headers: {
            Authorization: `Bearer ${apiToken}`
        }
    });
    if (!resp.ok) {
        return { error: true };
    }
    return (await resp.json()) as APIClan;
}

// Get clan war data
export async function getClanWarData(baseURI: string, apiToken: string, tag: string) {
    const resp = await fetch(`${baseURI}/v1/clans/${encodeURIComponent(tag)}/currentwar`, {
        headers: {
            Authorization: `Bearer ${apiToken}`
        }
    });
    if (!resp.ok) {
        return { error: true };
    }
    return (await resp.json()) as APIClanWar;
}

export function formatDate(date: string, dateStyle: Intl.DateTimeFormatOptions["dateStyle"] = "medium", locales = "en") {
    const dateToFormat = new Date(date.replaceAll("-", "/"));
    const dateFormatter = new Intl.DateTimeFormat(locales, { dateStyle });
    return dateFormatter.format(dateToFormat);
}

export function categorizeByRole(array: APIClanMember[]) {
    return array.reduce((acc: { [key: string]: APIClanMember[] }, curr) => {
        const role = curr.role;
        if (["leader", "coLeader", "member"].includes(role)) {
            if (!acc[role]) {
                acc[role] = [];
            }
            acc[role].push(curr);
        }
        return acc;
    }, {});
}
