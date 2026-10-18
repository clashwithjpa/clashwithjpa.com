export function createMobileMediaQuery(callback: (isMobile: boolean) => void, windowSize: "md" | "lg" = "md"): () => void {
    if (typeof window === "undefined") return () => {};

    const mediaQuery = window.matchMedia(windowSize === "md" ? "(max-width: 767.98px)" : "(max-width: 1023.98px)");

    callback(mediaQuery.matches);

    const handler = (e: MediaQueryListEvent) => callback(e.matches);
    mediaQuery.addEventListener("change", handler);

    return () => mediaQuery.removeEventListener("change", handler);
}
