<script lang="ts">
	import { page } from '$app/state';
    import { Button } from "$lib/components/ui/button/index.js"
</script>

<svelte:head>
	<title>JPA | {page.error?.message}</title>
</svelte:head>

<div
	class="relative h-screen w-screen bg-cover bg-center"
	style="background-image: url('/error.webp')"
>
	<div class="absolute z-0 size-full bg-zinc-900 opacity-80"></div>
	<div
		class="absolute z-1 flex size-full items-center justify-center overflow-hidden backdrop-blur-xs"
	>
		<div class="flex size-full flex-col items-center justify-center space-y-1 p-8">
			<h1 class="text-4xl font-bold text-white md:text-6xl">{page.status}</h1>
			<h2 class="text-xl font-semibold text-muted-foreground lg:text-2xl">
				{page.error?.message}
			</h2>

            <Button
                variant="outline"
                class="mt-4"
                size="lg"
                onclick={() => {
                    history.back();
                }}
            >
                Go Back
            </Button>
		</div>
	</div>
</div>
