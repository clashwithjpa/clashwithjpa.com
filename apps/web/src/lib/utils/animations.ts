import { animate, splitText, stagger } from "animejs";

export const DURATION = { FAST: 150, MEDIUM: 200, SMOOTH: 800 };

const animationMap = new WeakMap<Element, ReturnType<typeof animate>>();

export const textGlide = (el: Element, options?: { chars?: { wrap: string } }) => {
    const { chars } = splitText(el as HTMLElement, {
        ...options,
        chars: { wrap: "clip" },
    });
    animate(chars, {
        y: [{ to: ["100%", "0%"] }],
        duration: DURATION.SMOOTH,
        ease: "out(3)",
        delay: stagger(50),
    });
};

export const fadeUp = (
    el: Element | Element[] | NodeListOf<Element>,
    options?: {
        callback?: () => void;
    },
) => {
    const { callback } = options || {};
    return animate(el, {
        opacity: [0, 1],
        y: [{ to: ["100%", "0%"] }],
        easing: "out(3)",
        duration: DURATION.MEDIUM,
        delay: stagger(DURATION.FAST),
        ...(callback && { complete: callback }),
    });
};

export const fadeIn = (
    el: Element | Element[] | NodeListOf<Element>,
    options?: {
        callback?: () => void;
    },
) => {
    const { callback } = options || {};
    return animate(el, {
        opacity: [0, 1],
        easing: "out(3)",
        duration: DURATION.SMOOTH,
        delay: stagger(DURATION.FAST),
        ...(callback && { complete: callback }),
    });
};

export const wavyBounce = (el: Element) => {
    return animate(el, {
        scale: [
            { to: 0, duration: 0 },
            { to: 1.15, duration: 400 },
            { to: 0.95, duration: 200 },
            { to: 1.05, duration: 150 },
            { to: 1, duration: 150 },
        ],
        rotate: [
            { to: 0, duration: 0 },
            { to: -5, duration: 400 },
            { to: 3, duration: 200 },
            { to: -2, duration: 150 },
            { to: 0, duration: 150 },
        ],
        easing: "out(2)",
    });
};

export const bounceDown = (el: Element) => {
    return animate(el, {
        scale: 0.95,
        duration: 100,
        easing: "out(2)",
    });
};

export const bounceUp = (el: Element) => {
    return animate(el, {
        scale: [
            { to: 1.05, duration: 150 },
            { to: 1, duration: 150 },
        ],
        easing: "out(2)",
    });
};

export const slideDown = (
    el: Element | Element[] | NodeListOf<Element>,
    options?: {
        callback?: () => void;
    },
) => {
    const { callback } = options || {};
    return animate(el, {
        opacity: [0, 1],
        y: [{ from: -20, to: 0 }],
        easing: "out(3)",
        duration: DURATION.MEDIUM,
        ...(callback && { complete: callback }),
    });
};

export const rotateToggle = (el: Element, isOpen: boolean) => {
    const existing = animationMap.get(el);
    if (existing) {
        existing.pause();
    }

    const targetRotate = isOpen ? 180 : 0;

    const animation = animate(el, {
        rotate: targetRotate,
        duration: DURATION.SMOOTH,
        easing: "out(3)",
    });

    animationMap.set(el, animation);

    return animation;
};

export const cardSlideIn = (el: Element) => {
    const children = Array.from(el.children);

    animate(children, {
        opacity: [0, 1],
        y: [{ from: 30, to: 0 }],
        scale: [{ from: 0.95, to: 1 }],
        easing: "out(4)",
        duration: DURATION.MEDIUM,
        delay: stagger(80, { start: 100 }),
    });
};
