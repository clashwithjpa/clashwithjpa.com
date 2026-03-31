<script lang="ts">
    import { authClient } from "$lib/auth";
    import Seo from "$lib/components/ui/Seo.svelte";
    import { fadeIn } from "$lib/utils/animations";

    let session = authClient.useSession();
</script>

<Seo title="Apply" description="Fill the application to join JPA Clans" />

<div in:fadeIn class="grid size-full grid-cols-1 gap-4 md:grid-cols-2">
    <div class="hidden h-full rounded-xl bg-cover bg-no-repeat md:flex" style="background-image: url('/apply_bg.webp')"></div>
    <div class="flex size-full flex-col justify-center gap-6 text-left">
        <h1 class="w-full text-center text-4xl font-bold">Clan Application</h1>
    </div>
</div>
