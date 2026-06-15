<script lang="ts">
	import { onDestroy } from 'svelte';
	import type { MediaJoinGrant } from '$lib/server/media-join';
	import type { Room as LiveKitRoom } from 'livekit-client';

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
	let connectionStatus = $state('Starting · LiveKit');

	$effect(() => {
		if (!localVideo || !localStream) {
			return;
		}

		localVideo.srcObject = localStream;
	});

	$effect(() => {
		let cancelled = false;
		let room: LiveKitRoom | null = null;

		async function startPreview() {
			try {
				connectionStatus = grant.stub
					? 'Local preview only · LiveKit not configured'
					: 'Connecting · LiveKit';

				if (!grant.stub) {
					const { Room } = await import('livekit-client');
					room = new Room();

					await room.connect(grant.serverUrl, grant.token);

					if (cancelled) {
						room.disconnect();
						return;
					}

					const cameraPublication = await room.localParticipant.setCameraEnabled(cameraEnabled);
					await room.localParticipant.setMicrophoneEnabled(microphoneEnabled);

					if (cancelled) {
						room.disconnect();
						return;
					}

					if (localVideo && cameraPublication?.track) {
						cameraPublication.track.attach(localVideo);
					}

					connectionStatus = 'Connected · LiveKit';
					connectionLabel = cameraEnabled
						? 'Publishing camera and microphone choices into this prototype Room'
						: 'Connected with camera off · microphone choice published into this prototype Room';
					return;
				}

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
			room?.disconnect();
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
		{connectionStatus}
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
