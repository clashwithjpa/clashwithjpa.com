<script lang="ts">
	import type { PageProps } from './$types';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import { authClient } from '$lib/auth-client';
	import Discord from '$lib/assets/discord.svelte';

	let { data }: PageProps = $props();
</script>

<div
	class="relative h-screen w-screen bg-cover bg-center"
	style="background-image: url('/login.webp')"
>
	<div class="absolute z-0 size-full bg-zinc-950 opacity-80"></div>
	<div
		class="absolute z-1 flex size-full items-center justify-center overflow-hidden backdrop-blur-xs"
	>
		<div class="flex size-full flex-col items-center justify-center space-y-1 p-8">
			<Card.Root class="w-full max-w-sm shadow-lg bg-card/10">
				<Card.Content>
					<Button
						variant="default"
						class="mt-4 flex w-full items-center justify-center"
						size="lg"
						onclick={async () => {
							await authClient.signIn.social({
								provider: 'discord'
							});
						}}
					>
						<span class="mr-2">Continue with</span>
						<Discord class="size-5" />
					</Button>
				</Card.Content>
			</Card.Root>
		</div>
	</div>
</div>
