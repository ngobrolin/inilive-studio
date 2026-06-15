<script lang="ts">
	import { onDestroy } from 'svelte';
	import type { MediaJoinGrant } from '$lib/server/media-join';

	let {
		grant,
		cameraEnabled,
		microphoneEnabled,
	}: {
		grant: MediaJoinGrant;
		cameraEnabled: boolean;
		microphoneEnabled: boolean;
	} = $props();

	let localVideo = $state<HTMLVideoElement | null>(null);
	let connectionLabel = $state('Starting local media preview');
	let localStream = $state<MediaStream | null>(null);

	$effect(() => {
		if (!localVideo || !localStream) {
			return;
		}

		localVideo.srcObject = localStream;
	});

	$effect(() => {
		let cancelled = false;

		async function startPreview() {
			try {
				const stream = await navigator.mediaDevices.getUserMedia({
					video: cameraEnabled,
					audio: microphoneEnabled,
				});

				if (cancelled) {
					for (const track of stream.getTracks()) {
						track.stop();
					}
					return;
				}

				localStream = stream;
				connectionLabel = grant.stub
					? 'Local preview ready · configure LIVEKIT_URL, LIVEKIT_API_KEY, and LIVEKIT_API_SECRET for Room media'
					: 'Connecting to LiveKit Cloud';
			} catch {
				if (!cancelled) {
					connectionLabel = 'Unable to start local media preview';
				}
			}
		}

		void startPreview();

		return () => {
			cancelled = true;
		};
	});

	onDestroy(() => {
		if (!localStream) {
			return;
		}

		for (const track of localStream.getTracks()) {
			track.stop();
		}
	});
</script>

<section class="rounded-md border border-neutral-300 bg-white p-5 shadow-sm">
	<p class="text-sm font-semibold uppercase tracking-[0.14em] text-neutral-500">Room media</p>
	<p class="mt-3 text-lg font-semibold" data-testid="media-connection-status">
		Media ready · LiveKit
	</p>
	<p class="mt-2 text-sm leading-6 text-neutral-600">{connectionLabel}</p>

	<div class="mt-4 overflow-hidden rounded-md border border-neutral-200 bg-neutral-950">
		<video
			bind:this={localVideo}
			autoplay
			class="aspect-video w-full object-cover"
			data-testid="local-media-preview"
			muted
			playsinline
		></video>
	</div>
</section>
