/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Component, ComponentProps } from "svelte";
import Busy from "./Busy.svelte";
import Egg from "./Egg.svelte";
import Impersonation from "./Impersonation.svelte";
import Music from "./Music.svelte";
import Toast from "./Toast.svelte";

export type ActivityDef = {
    component: Component<any>;
    // Higher shows first. Short-lived things sit above long-running ones so
    // feedback is never hidden behind, say, the music pill.
    priority: number;
    // Default lifetime in ms. Omit for activities that stay until dismissed.
    duration?: number;
    // Showing a new one replaces any of the same kind instead of queueing.
    single?: boolean;
    // Tapping the island clears it instead of opening the cover.
    dismissOnClick?: boolean;
};

// To add an activity: write a component in this folder and register it here.
// NOTE: activity components must not import the island store, or the store and
// this registry import each other.
export const ACTIVITIES = {
    // Errors sit above confirmations so a later success can't cover one up.
    alert: { component: Toast, priority: 50, duration: 6000, single: true, dismissOnClick: true },
    toast: { component: Toast, priority: 40, duration: 3200, single: true, dismissOnClick: true },
    busy: { component: Busy, priority: 30 },
    impersonation: { component: Impersonation, priority: 20 },
    music: { component: Music, priority: 10 },
    egg: { component: Egg, priority: 0, duration: 4500, dismissOnClick: true },
} satisfies Record<string, ActivityDef>;

export type ActivityKind = keyof typeof ACTIVITIES;
export type ActivityProps<K extends ActivityKind> = ComponentProps<(typeof ACTIVITIES)[K]["component"]>;
