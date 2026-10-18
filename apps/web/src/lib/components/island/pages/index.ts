import type { Component } from "svelte";
import Clock from "./Clock.svelte";
import Controls from "./Controls.svelte";
import Customize from "./Customize.svelte";
import Jump from "./Jump.svelte";
import Music from "./Music.svelte";

export type CoverPage = { id: string; label: string; component: Component };

// Pages of the expanded island, in swipe order. Add new ones here.
export const PAGES: CoverPage[] = [
    { id: "controls", label: "Quick controls", component: Controls },
    { id: "music", label: "Music", component: Music },
    { id: "customize", label: "Customize", component: Customize },
    { id: "clock", label: "Clash clock", component: Clock },
    { id: "jump", label: "Jump to", component: Jump },
];
