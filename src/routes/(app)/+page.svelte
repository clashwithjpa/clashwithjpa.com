<script lang="ts">
	import { onMount } from 'svelte';
	import Pause from '@lucide/svelte/icons/pause';
	import Play from '@lucide/svelte/icons/play';
	import VolumeX from '@lucide/svelte/icons/volume-x';
	import Volume2 from '@lucide/svelte/icons/volume-2';
	import { Button } from '$lib/components/ui/button/index.js';
	import type { PageData } from './$types';

	let isPaused: boolean = $state(false);
	let isMuted: boolean = $state(true);
	let videoElement: HTMLVideoElement;

	function togglePause() {
		if (isPaused) {
			videoElement.play();
		} else {
			videoElement.pause();
		}
		isPaused = !isPaused;
	}

	function toggleMute() {
		videoElement.muted = !isMuted;
		isMuted = !isMuted;
	}

	onMount(() => {
		document.addEventListener('keydown', (event: KeyboardEvent) => {
			if (event.key === ' ') {
				togglePause();
			} else if (event.key === 'm') {
				toggleMute();
			}
		});
	});

	interface Props {
		data?: PageData;
	}

	let { data }: Props = $props();
	$inspect(data);
</script>

<svelte:head>
	<title>JPA | Home</title>
</svelte:head>

<main class="size-full">
	<img src="/clips/bg.webp" alt="Clash With JPA" class="fixed inset-0 size-full object-cover" />
	<video bind:this={videoElement} autoplay loop muted class="fixed inset-0 size-full object-cover">
		<source src="/clips/bg.webm" type="video/webm" />
	</video>

	<div class="fixed flex size-full items-center justify-center bg-background/50 p-8">
		<div class="flex flex-col items-center text-center sm:w-3/4 md:w-1/2">
			<h1 class="text-5xl font-bold lg:text-6xl">Clash With JPA</h1>
			<p class="mt-4 text-lg lg:text-xl">
				FWA experts in War-Farming, offering diverse clans and simultaneous 50v50 FWA wars and CWL
				action. Join one of the clans in our family today!
			</p>
			<!-- <div class="flex flex-col items-center justify-center gap-1">
				<CocButton href="/clans" class="mt-10">See our clans</CocButton>
				{#if data?.user}
					{#if data?.applicationEnabled}
						<CocButton href="/apply" class="mt-4">Clan Application Open!</CocButton>
					{/if}

					{#if data?.cwlEnabled}
						<CocButton href="/cwl" class="mt-4">CWL Open!</CocButton>
					{/if}
				{/if}
			</div> -->
			<div class="mt-10 flex flex-col space-y-4 sm:flex-row sm:space-y-0 sm:space-x-4">
				<Button href="/clans" variant="default" size="lg">See our clans</Button>
			</div>
		</div>
	</div>

	<div class="fixed right-8 bottom-4 z-10 flex space-x-4">
		<button
			onclick={togglePause}
			class="size-6 rounded-full transition-colors hover:text-muted-foreground"
		>
			{#if isPaused}
				<Play class="size-full" />
			{:else}
				<Pause class="size-full" />
			{/if}
		</button>
		<button
			onclick={toggleMute}
			class="size-6 rounded-full transition-colors hover:text-muted-foreground"
		>
			{#if isMuted}
				<VolumeX class="size-full" />
			{:else}
				<Volume2 class="size-full" />
			{/if}
		</button>
	</div>
</main>
