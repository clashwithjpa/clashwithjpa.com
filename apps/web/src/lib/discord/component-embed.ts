/**
 * Builder for Discord's "Link Component Embed" payload — the component-based
 * replacement for the classic Open Graph link preview.
 * https://discord.com/developers/docs/change-log (Link Component Embeds)
 *
 * The payload is a read-only subset of message components. Only the types
 * below are valid inside it; anything else invalidates the whole preview.
 */

const ComponentType = {
    ActionRow: 1,
    Button: 2,
    Section: 9,
    TextDisplay: 10,
    Thumbnail: 11,
    MediaGallery: 12,
    Separator: 14,
    Container: 17,
} as const;

// Component embeds only support the link button style — any other key
// (custom_id, sku_id, a non-link style, ...) invalidates the whole payload.
const LINK_BUTTON_STYLE = 5;

type UnfurledMedia = { url: string };

export type LinkButton = {
    type: typeof ComponentType.Button;
    style: typeof LINK_BUTTON_STYLE;
    url: string;
    label?: string;
    emoji?: { name: string };
};

export type TextDisplay = { type: typeof ComponentType.TextDisplay; content: string };

export type Thumbnail = {
    type: typeof ComponentType.Thumbnail;
    media: UnfurledMedia;
    description?: string;
    spoiler?: boolean;
};

export type MediaGalleryItem = { media: UnfurledMedia; description?: string; spoiler?: boolean };
export type MediaGallery = { type: typeof ComponentType.MediaGallery; items: MediaGalleryItem[] };
export type Separator = { type: typeof ComponentType.Separator; divider?: boolean; spacing?: 1 | 2 };
export type ActionRow = { type: typeof ComponentType.ActionRow; components: LinkButton[] };
export type Section = { type: typeof ComponentType.Section; components: TextDisplay[]; accessory: LinkButton | Thumbnail };
export type ContainerChild = TextDisplay | Section | MediaGallery | Separator | ActionRow;

export type Container = {
    type: typeof ComponentType.Container;
    accent_color?: number;
    spoiler?: boolean;
    components: ContainerChild[];
};

export type ComponentEmbedPayload = { component: Container };

export function textDisplay(content: string): TextDisplay {
    return { type: ComponentType.TextDisplay, content };
}

export function thumbnail(url: string, description?: string): Thumbnail {
    return { type: ComponentType.Thumbnail, media: { url }, description };
}

export function mediaGallery(items: MediaGalleryItem[]): MediaGallery {
    return { type: ComponentType.MediaGallery, items };
}

export function separator(divider = true, spacing: 1 | 2 = 1): Separator {
    return { type: ComponentType.Separator, divider, spacing };
}

export function linkButton(label: string, url: string, emoji?: string): LinkButton {
    return { type: ComponentType.Button, style: LINK_BUTTON_STYLE, url, label, ...(emoji ? { emoji: { name: emoji } } : {}) };
}

export function actionRow(buttons: LinkButton[]): ActionRow {
    return { type: ComponentType.ActionRow, components: buttons };
}

export function section(text: TextDisplay[], accessory: LinkButton | Thumbnail): Section {
    return { type: ComponentType.Section, components: text, accessory };
}

export function container(children: ContainerChild[], accentColor?: number): Container {
    return { type: ComponentType.Container, accent_color: accentColor, components: children };
}

/** `#RRGGBB` (or bare `RRGGBB`) to the decimal int Discord's `accent_color` expects. */
export function hexToAccentColor(hex: string): number {
    return Number.parseInt(hex.replace(/^#/, ""), 16);
}

/**
 * Serializes the payload for a `<script id="discord:component-embed" type="application/json">`
 * tag. Escapes `<` so a value can't prematurely close the script tag when inlined as HTML.
 */
export function serializeComponentEmbed(payload: ComponentEmbedPayload): string {
    return JSON.stringify(payload).replace(/</g, "\\u003c");
}
