export function createMobileMediaQuery(callback: (isMobile: boolean) => void, windowSize: "md" | "lg" = "md"): () => void {
    if (typeof window === "undefined") return () => {};

    const mediaQuery = window.matchMedia(windowSize === "md" ? "(max-width: 768px)" : "(max-width: 1024px)");

    callback(mediaQuery.matches);

    const handler = (e: MediaQueryListEvent) => callback(e.matches);
    mediaQuery.addEventListener("change", handler);

    return () => mediaQuery.removeEventListener("change", handler);
}
