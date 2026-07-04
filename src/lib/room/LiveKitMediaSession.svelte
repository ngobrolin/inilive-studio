<script lang="ts">
	import { onDestroy } from 'svelte';
	import type { MediaJoinGrant } from '$lib/server/media-join';
	import type {
		LocalVideoTrack,
		Participant,
		RemoteParticipant,
		RemoteTrack,
		RemoteTrackPublication,
		Room as LiveKitRoom,
	} from 'livekit-client';
	import {
		applyRefreshedLiveKitRoomToken,
		formatLiveKitConnectionError,
		liveKitSessionKey,
		startLiveKitTokenRefresh,
		withMediaSetupTimeout,
		type LiveKitTokenRefreshHandle,
	} from '$lib/room/livekit-media';
	import {
		applyRemoteEvent,
		emptyRemoteParticipants,
		listRemoteTiles,
		type RemoteTrackKind,
	} from '$lib/room/remote-participants';
	import { registerAudioSource, registerVideoSource } from '$lib/room/media-registry';
	import {
		registerScreenSharePublisher,
		type ScreenSharePublisher,
	} from '$lib/room/livekit-screen-share';

	let {
		grant,
		cameraEnabled,
		microphoneEnabled,
		screenShareActive,
		canScreenShare,
	}: {
		grant: MediaJoinGrant;
		cameraEnabled: boolean;
		microphoneEnabled: boolean;
		screenShareActive: boolean;
		canScreenShare: boolean;
	} = $props();

	let localVideo = $state<HTMLVideoElement | null>(null);
	let screenShareVideo = $state<HTMLVideoElement | null>(null);
	let connectionLabel = $state('Starting local media preview');
	let localStream = $state<MediaStream | null>(null);
	let connectionStatus = $state('Starting · LiveKit');
	let screenShareLabel = $state('Screen Share inactive');
	let remoteScreenShare = $state<{ identity: string; name: string; active: boolean } | null>(null);
	let remoteParticipants = $state(emptyRemoteParticipants());
	let localCameraTrack = $state<LocalVideoTrack | null>(null);
	let localScreenShareVideo = $state<HTMLVideoElement | null>(null);
	let localScreenShareTrack = $state<LocalVideoTrack | null>(null);
	let localMicrophoneTrack = $state<MediaStreamTrack | null>(null);

	const remoteTiles = $derived(listRemoteTiles(remoteParticipants));
	const sessionKey = $derived(
		liveKitSessionKey({
			stub: grant.stub,
			token: grant.token,
			serverUrl: grant.serverUrl,
			cameraEnabled,
			microphoneEnabled,
		}),
	);
	const shouldPublishScreenShare = $derived(canScreenShare && screenShareActive);

	// Keep the actual remote media elements out of reactive state so attaching
	// tracks never triggers a re-render loop.
	const remoteVideoElements = new Map<string, HTMLVideoElement>();
	const remoteAudioElements = new Map<string, HTMLAudioElement>();
	const pendingVideoTracks = new Map<string, RemoteTrack>();
	const pendingAudioTracks = new Map<string, RemoteTrack>();
	const remoteAudioUnregister = new Map<string, () => void>();
	let pendingScreenShareTrack: RemoteTrack | null = null;
	let connectedRoom: LiveKitRoom | null = null;
	let appliedScreenShareActive: boolean | null = null;

	function unregisterRemoteAudio(identity: string) {
		remoteAudioUnregister.get(identity)?.();
		remoteAudioUnregister.delete(identity);
	}

	function registerRemoteVideo(element: HTMLVideoElement, identity: string) {
		remoteVideoElements.set(identity, element);
		const unregisterCompositorSource = registerVideoSource(identity, 'camera', element);
		const pending = pendingVideoTracks.get(identity);
		if (pending) {
			pending.attach(element);
			pendingVideoTracks.delete(identity);
		}
		return {
			destroy() {
				remoteVideoElements.delete(identity);
				unregisterCompositorSource();
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

	function isScreenShare(publication: RemoteTrackPublication): boolean {
		return String(publication.source) === 'screen_share';
	}

	$effect(() => {
		if (!screenShareVideo || !pendingScreenShareTrack) {
			return;
		}

		pendingScreenShareTrack.attach(screenShareVideo);
		pendingScreenShareTrack = null;
	});

	$effect(() => {
		if (!localVideo || !localStream) {
			return;
		}

		localVideo.srcObject = localStream;
	});

	$effect(() => {
		if (!localVideo || !localCameraTrack) {
			return;
		}

		const element = localVideo;
		const track = localCameraTrack;
		track.attach(element);

		return () => {
			track.detach(element);
		};
	});

	// Expose the local participant's own camera, screen share, and microphone to
	// the Composed Room Feed compositor, which lives in a separate panel.
	$effect(() => {
		if (!localVideo) {
			return;
		}

		return registerVideoSource(grant.participantIdentity, 'camera', localVideo);
	});

	$effect(() => {
		const element = localScreenShareVideo;
		const track = localScreenShareTrack;
		if (!element || !track) {
			return;
		}

		track.attach(element);
		const unregisterCompositorSource = registerVideoSource(
			grant.participantIdentity,
			'screen',
			element,
		);

		return () => {
			track.detach(element);
			unregisterCompositorSource();
		};
	});

	$effect(() => {
		const track = localMicrophoneTrack;
		if (!track) {
			return;
		}

		return registerAudioSource(grant.participantIdentity, track);
	});

	$effect(() => {
		if (!screenShareVideo || !remoteScreenShare) {
			return;
		}

		return registerVideoSource(remoteScreenShare.identity, 'screen', screenShareVideo);
	});

	async function applyScreenShareState(room: LiveKitRoom, enabled: boolean) {
		if (enabled) {
			const screenSharePublication = await room.localParticipant.setScreenShareEnabled(true);
			localScreenShareTrack =
				(screenSharePublication?.track as LocalVideoTrack | undefined) ?? null;
			screenShareLabel = 'Publishing Host Screen Share into this Room';
			return;
		}

		await room.localParticipant.setScreenShareEnabled(false);
		localScreenShareTrack = null;
		screenShareLabel = 'Screen Share inactive';
	}

	$effect(() => {
		const enabled = shouldPublishScreenShare;
		const room = connectedRoom;

		if (!room || grant.stub || appliedScreenShareActive === enabled) {
			return;
		}

		appliedScreenShareActive = enabled;
		void applyScreenShareState(room, enabled).catch((error) => {
			if (appliedScreenShareActive === enabled) {
				appliedScreenShareActive = null;
			}
			connectionLabel = formatLiveKitConnectionError(error);
		});
	});

	$effect(() => {
		const activeSessionKey = sessionKey;
		let cancelled = false;
		let room: LiveKitRoom | null = null;
		let tokenRefresh: LiveKitTokenRefreshHandle | null = null;

		async function fetchRefreshedToken() {
			const response = await fetch(
				`/room/${grant.roomName}/media-token?participant=${encodeURIComponent(grant.participantIdentity)}`,
			);
			if (!response.ok) {
				throw new Error('LiveKit token refresh failed.');
			}

			return (await response.json()) as { token: string; expiresAt: number };
		}

		function startTokenRefresh(activeRoom: LiveKitRoom) {
			tokenRefresh?.cancel();
			tokenRefresh = startLiveKitTokenRefresh({
				expiresAt: grant.expiresAt,
				fetchToken: fetchRefreshedToken,
				onToken: (token) => {
					applyRefreshedLiveKitRoomToken(activeRoom, token);
				},
			});
		}

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
					connectedRoom = room;
					registerScreenSharePublisher({
						setEnabled: (enabled) => applyScreenShareState(room!, enabled),
					} satisfies ScreenSharePublisher);

					if (cancelled || activeSessionKey !== sessionKey) {
						await room.disconnect();
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

					const cameraPublication = await withMediaSetupTimeout(
						room.localParticipant.setCameraEnabled(cameraEnabled),
						15_000,
						'Camera setup timed out. Close other apps using the camera and reload Backstage.',
					);
					const microphonePublication = await withMediaSetupTimeout(
						room.localParticipant.setMicrophoneEnabled(microphoneEnabled),
						15_000,
						'Microphone setup timed out. Close other apps using the microphone and reload Backstage.',
					);

					if (cancelled || activeSessionKey !== sessionKey) {
						await room.disconnect();
						return;
					}

					localCameraTrack = (cameraPublication?.track as LocalVideoTrack | undefined) ?? null;
					localMicrophoneTrack = microphonePublication?.track?.mediaStreamTrack ?? null;
					connectionStatus = 'Connected · LiveKit';
					connectionLabel = cameraEnabled
						? 'Publishing camera and microphone choices into this Room'
						: 'Connected with camera off · microphone choice published into this Room';
					startTokenRefresh(room);

					return;
				}

				const stream = await navigator.mediaDevices.getUserMedia({
					video: cameraEnabled,
					audio: microphoneEnabled,
				});

				if (cancelled || activeSessionKey !== sessionKey) {
					for (const track of stream.getTracks()) {
						track.stop();
					}
					return;
				}

				localStream = stream;
				localMicrophoneTrack = stream.getAudioTracks()[0] ?? null;
				connectionLabel = grant.stub
					? 'Local preview ready · configure LIVEKIT_URL, LIVEKIT_API_KEY, and LIVEKIT_API_SECRET for Room media'
					: 'Connecting to LiveKit Cloud';
			} catch (error) {
				if (!cancelled && activeSessionKey === sessionKey) {
					connectionStatus = grant.stub
						? 'Local preview failed'
						: 'LiveKit connection failed';
					connectionLabel = formatLiveKitConnectionError(error);
					localCameraTrack = null;
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
			unregisterRemoteAudio(participant.identity);
		}

		function handleTrackSubscribed(
			track: RemoteTrack,
			publication: RemoteTrackPublication,
			participant: Participant,
		) {
			if (isScreenShare(publication)) {
				remoteScreenShare = {
					identity: participant.identity,
					name: participant.name || participant.identity,
					active: true,
				};
				if (screenShareVideo) {
					track.attach(screenShareVideo);
				} else {
					pendingScreenShareTrack = track;
				}
				return;
			}

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
				unregisterRemoteAudio(participant.identity);
				remoteAudioUnregister.set(
					participant.identity,
					registerAudioSource(participant.identity, track.mediaStreamTrack),
				);
			}
		}

		function handleTrackUnsubscribed(
			track: RemoteTrack,
			publication: RemoteTrackPublication,
			participant: Participant,
		) {
			if (isScreenShare(publication)) {
				track.detach();
				pendingScreenShareTrack = null;
				if (remoteScreenShare?.identity === participant.identity) {
					remoteScreenShare = null;
				}
				return;
			}

			const kind = trackKind(publication);
			if (!kind) {
				return;
			}

			if (kind === 'microphone') {
				unregisterRemoteAudio(participant.identity);
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
			tokenRefresh?.cancel();
			tokenRefresh = null;
			localCameraTrack = null;
			localScreenShareTrack = null;
			localMicrophoneTrack = null;
			const activeRoom = room;
			room = null;
			connectedRoom = null;
			appliedScreenShareActive = null;
			registerScreenSharePublisher(null);
			void activeRoom?.localParticipant.setScreenShareEnabled(false);
			void activeRoom?.disconnect();
			remoteVideoElements.clear();
			remoteAudioElements.clear();
			pendingVideoTracks.clear();
			pendingAudioTracks.clear();
			for (const unregister of remoteAudioUnregister.values()) {
				unregister();
			}
			remoteAudioUnregister.clear();
			pendingScreenShareTrack = null;
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
	{#if canScreenShare || remoteScreenShare}
		<p class="mt-2 text-sm font-semibold text-cyan-950">{screenShareLabel}</p>
	{/if}

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

	<!--
		Offscreen sink for the host's own Screen Share so the Composed Room Feed
		compositor can draw it. Kept playing (not display:none) so the browser does
		not suspend frame decoding.
	-->
	<!-- svelte-ignore a11y_media_has_caption -->
	<video
		bind:this={localScreenShareVideo}
		autoplay
		class="pointer-events-none absolute h-px w-px opacity-0"
		muted
		playsinline
	></video>

	{#if remoteScreenShare}
		<div
			class="mt-4 overflow-hidden rounded-md border border-cyan-300 bg-neutral-950"
			data-testid="remote-screen-share"
		>
			<div class="border-b border-cyan-900 bg-cyan-950 px-3 py-2 text-sm font-semibold text-cyan-50">
				{remoteScreenShare.name} Screen Share
			</div>
			<video
				bind:this={screenShareVideo}
				autoplay
				class="aspect-video w-full object-contain"
				playsinline
			></video>
		</div>
	{/if}

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
