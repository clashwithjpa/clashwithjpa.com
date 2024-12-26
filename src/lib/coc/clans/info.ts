import type { ClanType, ClanMemberType, ClanTagsType } from "$lib/coc/clans/types";
import clans from "../../../../data/clans.json";

export function getClanTags() {
    return JSON.parse(JSON.stringify(clans)) as ClanTagsType;
}

export async function getClanInfo(baseURI: string, clanTag: string, apiToken: string): Promise<ClanType> {
    clanTag = clanTag.replace("#", "%23");
    const response = await fetch(`${baseURI}/v1/clans/${clanTag}`, {
        method: "GET",
        headers: {
            Accept: "application/json",
            Authorization: `Bearer ${apiToken}`
        }
    });

    if (!response.ok) {
        throw new Error(`Error fetching clan info: ${response.statusText}`);
    }
    return await response.json();
}

export async function getClansInfo(baseURI: string, clanTags: string[], apiToken: string): Promise<ClanType[]> {
    const promises = clanTags.map((tag) => getClanInfo(baseURI, tag, apiToken));
    return await Promise.all(promises);
}

export function formatDate(date: string, dateStyle: Intl.DateTimeFormatOptions["dateStyle"] = "medium", locales = "en") {
    const dateToFormat = new Date(date.replaceAll("-", "/"));
    const dateFormatter = new Intl.DateTimeFormat(locales, { dateStyle });
    return dateFormatter.format(dateToFormat);
}

export function categorizeByRole(array: ClanMemberType[]) {
    return array.reduce((acc: { [key: string]: ClanMemberType[] }, curr) => {
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
