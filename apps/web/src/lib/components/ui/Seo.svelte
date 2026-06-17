<script lang="ts">
    import { page } from "$app/state";

    interface Props {
        title?: string;
        description?: string;
        image?: string;
        author?: string;
    }
    let { title = "", description = "", image = "/logo.webp", author = "Team JPA" }: Props = $props();

    let absoluteImage = $derived(image.startsWith("http") ? image : `${page.url.origin}${image}`);
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
</svelte:head>
