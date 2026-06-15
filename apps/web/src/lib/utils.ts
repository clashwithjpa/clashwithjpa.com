import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type WithoutChild<T> = T extends { child?: any } ? Omit<T, "child"> : T;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type WithoutChildren<T> = T extends { children?: any } ? Omit<T, "children"> : T;
export type WithoutChildrenOrChild<T> = WithoutChildren<WithoutChild<T>>;
export type WithElementRef<T, U extends HTMLElement = HTMLElement> = T & {
    ref?: U | null;
};

// Return the first value that isn't null/undefined/0; used to backfill numeric fields.
export function num(...vals: (number | null | undefined)[]) {
    return vals.find((v) => v != null && v !== 0) ?? null;
}

// Return the first value that isn't null/undefined/""; used to backfill string fields.
export function str(...vals: (string | null | undefined)[]) {
    return vals.find((v) => v != null && v !== "") ?? null;
}

export function getOrdinal(n: number) {
    const s = ["th", "st", "nd", "rd"],
        v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

export function formatDate(dateStr?: string | undefined | null | Date) {
    if (!dateStr) return "";
    const date = typeof dateStr === "string" ? new Date(dateStr) : dateStr;
    const day = getOrdinal(date.getDate());
    const month = date.toLocaleString("en-US", { month: "long" }).toWellFormed();
    const year = date.getFullYear();
    return `${day} ${month} ${year}`;
}

export function formatDateTime(dateStr?: string | undefined | null | Date) {
    if (!dateStr) return "";
    const date = typeof dateStr === "string" ? new Date(dateStr) : dateStr;
    let hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? "pm" : "am";
    hours = hours % 12;
    hours = hours ? hours : 12; // the hour '0' should be '12'
    const minStr = minutes === 0 ? "" : `:${minutes.toString().padStart(2, "0")}`;
    return `${formatDate(dateStr)} at ${hours}${minStr}${ampm}`;
}

export function formatRelativeTime(dateStr?: string | undefined | null | Date) {
    if (!dateStr) return "";
    const date = typeof dateStr === "string" ? new Date(dateStr) : dateStr;
    const seconds = Math.round((Date.now() - date.getTime()) / 1000);
    if (seconds < 45) return "just now";
    const minutes = Math.round(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.round(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.round(hours / 24);
    if (days < 7) return `${days}d ago`;
    return formatDate(date);
}

export function fromArkValue(val: any) {
    if (!val) return null;

    if (Array.isArray(val)) {
        return val.map((v) => v.toDate?.() ?? new Date(v));
    }

    return val.toDate?.() ?? new Date(val);
}
