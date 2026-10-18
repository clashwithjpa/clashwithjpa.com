import { getContext, setContext } from "svelte";

const KEY = Symbol("popup-host");

export type PopupHost = {
    // Popups render inside this scrolling element, so they scroll with their
    // anchor and get clipped by it like the rest of its content.
    container: () => HTMLElement | null;
    // Placement flips and shifts within this element's box.
    boundary: () => HTMLElement | null;
};

export function setPopupHost(host: PopupHost) {
    setContext(KEY, host);
}

export function getPopupHost(): PopupHost | undefined {
    return getContext(KEY);
}

/** Opts a subtree back out, e.g. popups anchored outside the host such as table header filters. */
export function clearPopupHost() {
    setContext(KEY, undefined);
}
