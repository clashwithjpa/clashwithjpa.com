<script lang="ts">
    import { page } from "$app/state";
    import {
        actionRow,
        container,
        hexToAccentColor,
        linkButton,
        section,
        separator,
        serializeComponentEmbed,
        textDisplay,
        thumbnail,
        type ComponentEmbedPayload,
        type Container,
        type LinkButton,
    } from "$lib/discord/component-embed";

    interface Props {
        title?: string;
        description?: string;
        image?: string;
        author?: string;
        accentColor?: string;
        buttons?: { label: string; url: string; emoji?: string }[];
        embed?: Container;
    }
    let { title = "", description = "", image = "/logo.webp", author = "JPA", accentColor = "#06B6D4", buttons = [], embed }: Props = $props();

    let absoluteImage = $derived(image.startsWith("http") ? image : `${page.url.origin}${image}`);
    let headline = $derived(title ? title : "JPA");

    let defaultEmbed = $derived.by((): Container => {
        const buttonComponents: LinkButton[] = buttons.map((b) => linkButton(b.label, b.url, b.emoji));
        return container(
            [
                section([textDisplay(`# **[${headline}](${page.url.href})**\n${description}`)], thumbnail(absoluteImage, headline)),
                ...(buttonComponents.length ? [separator(), actionRow(buttonComponents)] : []),
            ],
            hexToAccentColor(accentColor),
        );
    });

    let componentEmbedJson = $derived(serializeComponentEmbed({ component: embed ?? defaultEmbed } satisfies ComponentEmbedPayload));
</script>

<svelte:head>
    <title>JPA {title ? `| ${title}` : ""}</title>
    <link rel="icon" type="image/svg" href="/logo.webp" />
    <meta name="description" content={description} />
    <meta name="theme-color" content="#0C0A09" />
    <meta name="background-color" content="#020617" />
    <meta name="author" content={author} />

    <meta property="og:type" content="website" />
    <meta property="og:url" content={page.url.href} />
    <meta property="og:title" content={title ? `${title}` : "JPA"} />
    <meta property="og:description" content={description} />
    <meta property="og:image" content={absoluteImage} />

    <meta property="twitter:card" content="summary" />
    <meta property="twitter:title" content={title ? `${title}` : "JPA"} />
    <meta property="twitter:description" content={description} />
    <meta property="twitter:image" content={absoluteImage} />

    <!-- eslint-disable-next-line svelte/no-at-html-tags -- componentEmbedJson is server-generated JSON, not user input -->
    {@html `<script id="discord:component-embed" type="application/json">${componentEmbedJson}<` + "/script>"}
</svelte:head>
