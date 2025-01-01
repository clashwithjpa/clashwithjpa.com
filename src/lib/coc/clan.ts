import type { APIClanMember } from "$lib/coc/types";

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
