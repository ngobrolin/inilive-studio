<script lang="ts">
	import { onDestroy } from 'svelte';
	import type { MediaJoinGrant } from '$lib/server/media-join';
	import type {
		Participant,
		RemoteParticipant,
		RemoteTrack,
		RemoteTrackPublication,
		Room as LiveKitRoom,
	} from 'livekit-client';
	import {
		applyRemoteEvent,
		emptyRemoteParticipants,
		listRemoteTiles,
		type RemoteTrackKind,
	} from '$lib/room/remote-participants';

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
	let remoteParticipants = $state(emptyRemoteParticipants());

	const remoteTiles = $derived(listRemoteTiles(remoteParticipants));

	// Keep the actual remote media elements out of reactive state so attaching
	// tracks never triggers a re-render loop.
	const remoteVideoElements = new Map<string, HTMLVideoElement>();
	const remoteAudioElements = new Map<string, HTMLAudioElement>();
	const pendingVideoTracks = new Map<string, RemoteTrack>();
	const pendingAudioTracks = new Map<string, RemoteTrack>();

	function registerRemoteVideo(element: HTMLVideoElement, identity: string) {
		remoteVideoElements.set(identity, element);
		const pending = pendingVideoTracks.get(identity);
		if (pending) {
			pending.attach(element);
			pendingVideoTracks.delete(identity);
		}
		return {
			destroy() {
				remoteVideoElements.delete(identity);
			},
		};
	}

	function registerRemoteAudio(element: HTMLAudioElement, identity: string) {
		remoteAudioElements.set(identity, element);
		const pending = pendingAudioTracks.get(identity);
		if (pending) {
			pending.attach(element);
			pendingAudioTracks.delete(identity);
		}
		return {
			destroy() {
				remoteAudioElements.delete(identity);
			},
		};
	}

	function trackKind(publication: RemoteTrackPublication): RemoteTrackKind | null {
		const source = String(publication.source);
		if (source === 'camera') {
			return 'camera';
		}
		if (source === 'microphone') {
			return 'microphone';
		}
		return null;
	}

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
					const { RoomEvent, Room } = await import('livekit-client');
					room = new Room();

					room.on(RoomEvent.TrackSubscribed, handleTrackSubscribed);
					room.on(RoomEvent.TrackUnsubscribed, handleTrackUnsubscribed);
					room.on(RoomEvent.ParticipantConnected, handleParticipantConnected);
					room.on(RoomEvent.ParticipantDisconnected, handleParticipantDisconnected);

					await room.connect(grant.serverUrl, grant.token);

					if (cancelled) {
						room.disconnect();
						return;
					}

					// Render participants who were already in the Room before we joined.
					for (const participant of room.remoteParticipants.values()) {
						addRemoteParticipant(participant);
						for (const publication of participant.trackPublications.values()) {
							if (publication.track && publication.isSubscribed) {
								handleTrackSubscribed(
									publication.track,
									publication as RemoteTrackPublication,
									participant,
								);
							}
						}
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

		function addRemoteParticipant(participant: RemoteParticipant) {
			remoteParticipants = applyRemoteEvent(remoteParticipants, {
				type: 'connected',
				identity: participant.identity,
				name: participant.name || participant.identity,
			});
		}

		function handleParticipantConnected(participant: RemoteParticipant) {
			addRemoteParticipant(participant);
		}

		function handleParticipantDisconnected(participant: RemoteParticipant) {
			remoteParticipants = applyRemoteEvent(remoteParticipants, {
				type: 'disconnected',
				identity: participant.identity,
			});
			remoteVideoElements.delete(participant.identity);
			remoteAudioElements.delete(participant.identity);
			pendingVideoTracks.delete(participant.identity);
			pendingAudioTracks.delete(participant.identity);
		}

		function handleTrackSubscribed(
			track: RemoteTrack,
			publication: RemoteTrackPublication,
			participant: Participant,
		) {
			const kind = trackKind(publication);
			if (!kind) {
				return;
			}

			remoteParticipants = applyRemoteEvent(remoteParticipants, {
				type: 'trackOn',
				identity: participant.identity,
				name: participant.name || participant.identity,
				kind,
			});

			if (kind === 'camera') {
				const element = remoteVideoElements.get(participant.identity);
				if (element) {
					track.attach(element);
				} else {
					pendingVideoTracks.set(participant.identity, track);
				}
			} else {
				const element = remoteAudioElements.get(participant.identity);
				if (element) {
					track.attach(element);
				} else {
					pendingAudioTracks.set(participant.identity, track);
				}
			}
		}

		function handleTrackUnsubscribed(
			track: RemoteTrack,
			publication: RemoteTrackPublication,
			participant: Participant,
		) {
			const kind = trackKind(publication);
			if (!kind) {
				return;
			}

			track.detach();
			remoteParticipants = applyRemoteEvent(remoteParticipants, {
				type: 'trackOff',
				identity: participant.identity,
				kind,
			});
		}

		void startPreview();

		return () => {
			cancelled = true;
			room?.disconnect();
			remoteVideoElements.clear();
			remoteAudioElements.clear();
			pendingVideoTracks.clear();
			pendingAudioTracks.clear();
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

	{#if remoteTiles.length > 0}
		<p class="mt-5 text-sm font-semibold uppercase tracking-[0.14em] text-neutral-500">
			Other participants
		</p>
		<div class="mt-3 grid gap-3 sm:grid-cols-2" data-testid="remote-participants">
			{#each remoteTiles as tile (tile.identity)}
				<div
					class="overflow-hidden rounded-md border border-neutral-200 bg-neutral-950"
					data-testid="remote-participant"
				>
					<div class="relative flex aspect-video items-center justify-center text-white">
						{#if !tile.cameraOn}
							<div class="text-center" data-testid="remote-camera-off">
								<div
									class="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-neutral-800 text-xl font-semibold"
								>
									{tile.name.slice(0, 1).toUpperCase()}
								</div>
								<p class="mt-2 text-lg font-semibold">{tile.name}</p>
								<p class="mt-1 text-xs text-neutral-400">Camera off</p>
							</div>
						{/if}
						<!-- svelte-ignore a11y_media_has_caption -->
						<video
							class="absolute inset-0 h-full w-full object-cover"
							class:hidden={!tile.cameraOn}
							autoplay
							playsinline
							use:registerRemoteVideo={tile.identity}
						></video>
						<audio autoplay use:registerRemoteAudio={tile.identity}></audio>
					</div>
					<div class="flex items-center justify-between gap-3 p-3">
						<p class="text-sm font-semibold text-neutral-950">{tile.name}</p>
						<p
							class="rounded-full bg-neutral-100 px-3 py-1 text-xs font-semibold text-neutral-700"
						>
							{tile.microphoneOn ? 'Mic on' : 'Mic muted'}
						</p>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</section>
