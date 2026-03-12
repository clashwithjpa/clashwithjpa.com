<script lang="ts">
    interface Props {
        title?: string;
        description?: string;
        image?: string;
        author?: string;
    }
    let { title = "", description = "", image = "/logo.webp", author = "Team JPA" }: Props = $props();
</script>

<svelte:head>
    <title>JPA {title ? `| ${title}` : ""}</title>
    <link rel="icon" type="image/svg" href="/logo.webp" />
    <meta name="description" content={description} />
    <meta name="theme-color" content="#0C0A09" />
    <meta name="background-color" content="#020617" />
    <meta name="author" content={author} />

    <!-- Open Graph / Facebook -->
    <meta property="og:type" content="website" />
    <meta property="og:title" content={title ? `${title}` : "JPA"} />
    <meta property="og:description" content={description} />
    <meta property="og:image" content={image} />

    <!-- Twitter -->
    <meta property="twitter:card" content="summary" />
    <meta property="twitter:title" content={title ? `${title}` : "JPA"} />
    <meta property="twitter:description" content={description} />
    <meta property="twitter:image" content={image} />
</svelte:head>
