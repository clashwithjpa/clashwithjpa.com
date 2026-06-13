# Product

## Register

product

## Users

Existing JPA clan members — CoC players actively participating in FWA wars and CWL. They open the app during war windows to check war status, review CWL assignments, inspect stats, and manage their clan roster. They are mobile-first, game-native users who expect information density and fast navigation, not marketing copy.

## Product Purpose

ClashwithJPA is the operational hub for the JPA FWA clan family. Members use it to track simultaneous 50v50 FWA wars, manage CWL participation, and administer clans. Success looks like: a member opens the app and immediately understands their war status, their responsibilities, and their clan's performance — without friction.

## Brand Personality

**Tactical. Precise. Battle-hardened.**

The product lives in the Clash of Clans universe but serves its most serious, strategy-first players. The tone is confident and no-nonsense — a war room, not a lobby screen. Visually it borrows from CoC's own language (shields, emblems, bold color accents) but filters out the kitsch and amplifies the craft. Feels earned, not decorated.

## Anti-references

- **Generic SaaS dashboards** (Vercel, Linear, Stripe) — too corporate, too sterile, zero game DNA.
- **Warm-neutral / cream AI-default aesthetic** — warm beige backgrounds, soft shadows, "cozy" — completely wrong register.
- **Cluttered mobile game UIs** — particle-heavy, noisy, every pixel screaming. CoC's spirit without CoC's clutter.
- **Reddit-style community sites** — flat, text-wall, no visual identity.

## Design Principles

1. **War room, not welcome mat.** Every screen is a decision surface. Lead with the data, reduce decoration to what earns its place.
2. **Game DNA, not game kitsch.** CoC's color language and typography are references, not costumes. Borrow the confidence, skip the excess.
3. **Stone is the foundation.** The strict Stone palette is non-negotiable. Color is for CoC-specific components (CocBtn, badges) — not for general UI chrome.
4. **Snappy is correct.** 200ms transitions, base-2 spacing, no layout shifts. The UI should feel as responsive as the game itself.
5. **Density earns trust.** Members want full information at a glance. Spacious isn't virtuous here; information-dense, well-organized is.

## Accessibility & Inclusion

WCAG AA minimum. The dark theme (stone-950 base) must maintain ≥4.5:1 contrast for all body text against backgrounds. Stone-400 tertiary text is the floor — do not go lighter. No motion that can't be toggled via `prefers-reduced-motion`.
