<script lang="ts">
	import { onDestroy } from 'svelte';
	import type { BroadcastIngestGrant, RoomBroadcastView } from '$lib/server/broadcast-state';
	import type { RoomParticipant, RoomScreenShare } from '$lib/server/room-presence';
	import { createCompleteWhipOfferSdp, preferPlainWhipCodecs } from './whip-offer';

	let {
		participants,
		activeScreenShare,
		broadcast,
		hostWhipIngestGrant,
	}: {
		participants: RoomParticipant[];
		activeScreenShare: RoomScreenShare | null;
		broadcast: RoomBroadcastView;
		hostWhipIngestGrant: BroadcastIngestGrant | null;
	} = $props();

	let captureStatus = $state('Waiting for canvas');
	let whipStatus = $state('WHIP ingest idle');
	let fpsDisplay: HTMLElement | null = null;
	let streamReady = $state(0);
	const capture = {
		stream: null as MediaStream | null,
	};
	let audioContext: AudioContext | null = null;
	let silentAudioTrack: MediaStreamTrack | null = null;
	let currentWhipConnection: RTCPeerConnection | null = null;
	let currentWhipPublishKey = '';

	const width = 1280;
	const height = 720;
	const visibleParticipants = $derived(participants.filter((participant) => !participant.removed).slice(0, 4));
	const outputLabel = $derived(`${width}×${height} · captureStream(30)`);

	function composeCanvas(sourceCanvas: HTMLCanvasElement) {
		const context = sourceCanvas.getContext('2d');
		if (!context) {
			captureStatus = 'Canvas unavailable';
			return {};
		}

		capture.stream = createComposedStream(sourceCanvas);
		streamReady += 1;
		captureStatus = capture.stream ? 'Composed feed stream ready' : 'captureStream unavailable';
		let localLastFpsSample = performance.now();
		let localFrameCount = 0;
		let localAnimationFrame = 0;

		function draw(now: number) {
			if (!context) {
				return;
			}

			drawFrame(context, now);
			localFrameCount += 1;

			if (now - localLastFpsSample >= 1000) {
				if (fpsDisplay) {
					fpsDisplay.textContent = `${Math.round((localFrameCount * 1000) / (now - localLastFpsSample))}`;
				}
				localFrameCount = 0;
				localLastFpsSample = now;
			}

			localAnimationFrame = requestAnimationFrame(draw);
		}

		localAnimationFrame = requestAnimationFrame(draw);

		return {
			destroy() {
				cancelAnimationFrame(localAnimationFrame);
			},
		};
	}

	onDestroy(() => {
		stopWhipPublisher();
		for (const track of capture.stream?.getTracks() ?? []) {
			track.stop();
		}
		silentAudioTrack?.stop();
		void audioContext?.close();
	});

	$effect(() => {
		const currentStream = streamReady > 0 ? capture.stream : null;
		const shouldPublish =
			broadcast.state === 'broadcasting' && hostWhipIngestGrant !== null && currentStream !== null;
		const publishKey = shouldPublish
			? `${hostWhipIngestGrant.whipUrl}:${hostWhipIngestGrant.bearerToken}`
			: '';

		if (publishKey === currentWhipPublishKey) {
			return;
		}

		stopWhipPublisher();
		currentWhipPublishKey = publishKey;

		const currentGrant = hostWhipIngestGrant;

		if (!shouldPublish || !currentGrant || !currentStream) {
			whipStatus = broadcast.state === 'broadcasting' ? 'Waiting for Composed Room Feed' : 'WHIP ingest idle';
			return;
		}

		void startWhipPublisher({
			grant: currentGrant,
			composedStream: currentStream,
		});
	});

	function createComposedStream(sourceCanvas: HTMLCanvasElement): MediaStream | null {
		if (typeof sourceCanvas.captureStream !== 'function') {
			return null;
		}

		const nextStream = sourceCanvas.captureStream(30);
		return nextStream;
	}

	async function startWhipPublisher(input: {
		grant: BroadcastIngestGrant;
		composedStream: MediaStream;
	}) {
		if (!globalThis.RTCPeerConnection) {
			whipStatus = 'WHIP ingest unavailable';
			return;
		}

		const peerConnection = new RTCPeerConnection();
		currentWhipConnection = peerConnection;
		whipStatus = 'WHIP ingest connecting';

		try {
			const publishStream = withSilentAudio(input.composedStream);
			for (const track of publishStream.getTracks()) {
				peerConnection.addTrack(track, input.composedStream);
			}
			preferPlainWhipCodecs(peerConnection, {
				video: RTCRtpSender.getCapabilities('video'),
				audio: RTCRtpSender.getCapabilities('audio'),
			});

			const offerSdp = await createCompleteWhipOfferSdp(peerConnection);

			const response = await fetch(input.grant.whipUrl, {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${input.grant.bearerToken}`,
					'Content-Type': 'application/sdp',
				},
				body: offerSdp,
			});

			if (!response.ok) {
				throw new Error(`WHIP ingest failed with status ${response.status}`);
			}

			if (currentWhipConnection === peerConnection) {
				whipStatus = 'WHIP ingest connected';
			}

			const answer = await response.text();
			if (answer.trim() && response.headers.get('Content-Type')?.includes('application/sdp')) {
				await peerConnection.setRemoteDescription({ type: 'answer', sdp: answer });
			}
		} catch {
			if (currentWhipConnection === peerConnection) {
				whipStatus = 'WHIP ingest failed';
				stopWhipPublisher();
			}
		}
	}

	function stopWhipPublisher() {
		currentWhipConnection?.close();
		currentWhipConnection = null;
	}

	function withSilentAudio(videoStream: MediaStream): MediaStream {
		if (videoStream.getAudioTracks().length > 0) {
			return videoStream;
		}

		audioContext ??= new AudioContext();
		const gain = audioContext.createGain();
		const oscillator = audioContext.createOscillator();
		const destination = audioContext.createMediaStreamDestination();
		gain.gain.value = 0;
		oscillator.connect(gain).connect(destination);
		oscillator.start();

		silentAudioTrack = destination.stream.getAudioTracks()[0] ?? null;
		if (silentAudioTrack) {
			videoStream.addTrack(silentAudioTrack);
		}

		return videoStream;
	}

	function drawFrame(context: CanvasRenderingContext2D, now: number) {
		context.fillStyle = '#0a0a0a';
		context.fillRect(0, 0, width, height);

		if (activeScreenShare) {
			drawScreenShareLayout(context, activeScreenShare, visibleParticipants, now);
		} else {
			drawParticipantGrid(context, visibleParticipants);
		}

		drawBroadcastChrome(context);
	}

	function drawScreenShareLayout(
		context: CanvasRenderingContext2D,
		screenShare: RoomScreenShare,
		roomParticipants: RoomParticipant[],
		now: number,
	) {
		context.fillStyle = '#083344';
		context.fillRect(32, 32, 1216, 536);
		context.strokeStyle = '#67e8f9';
		context.lineWidth = 4;
		context.strokeRect(32, 32, 1216, 536);

		context.fillStyle = '#ecfeff';
		context.font = '700 52px system-ui, sans-serif';
		context.fillText(`${screenShare.displayName} Screen Share`, 80, 130);
		context.font = '500 28px system-ui, sans-serif';
		context.fillText('Primary visual source for the Composed Room Feed', 80, 180);

		const pulse = Math.round(24 + Math.sin(now / 180) * 10);
		context.fillStyle = `rgb(34 211 238 / ${0.55 + pulse / 100})`;
		context.fillRect(80, 248, 1120, 168);

		roomParticipants.forEach((participant, index) => {
			const tileWidth = 280;
			const tileHeight = 120;
			const x = 32 + index * (tileWidth + 16);
			const y = 584;
			drawParticipantTile(context, participant, x, y, tileWidth, tileHeight, true);
		});
	}

	function drawParticipantGrid(context: CanvasRenderingContext2D, roomParticipants: RoomParticipant[]) {
		const layouts = [
			{ x: 32, y: 64, width: 1216, height: 592 },
			{ x: 32, y: 64, width: 592, height: 592 },
			{ x: 656, y: 64, width: 592, height: 592 },
			{ x: 32, y: 64, width: 592, height: 280 },
			{ x: 656, y: 64, width: 592, height: 280 },
			{ x: 32, y: 376, width: 592, height: 280 },
			{ x: 656, y: 376, width: 592, height: 280 },
		];

		const activeLayouts = roomParticipants.length <= 1 ? [layouts[0]] : layouts.slice(3);
		roomParticipants.forEach((participant, index) => {
			const layout = activeLayouts[index];
			if (!layout) {
				return;
			}
			drawParticipantTile(context, participant, layout.x, layout.y, layout.width, layout.height, false);
		});
	}

	function drawParticipantTile(
		context: CanvasRenderingContext2D,
		participant: RoomParticipant,
		x: number,
		y: number,
		tileWidth: number,
		tileHeight: number,
		compact: boolean,
	) {
		context.fillStyle = participant.cameraEnabled ? '#164e63' : '#171717';
		context.fillRect(x, y, tileWidth, tileHeight);
		context.strokeStyle = '#404040';
		context.lineWidth = 2;
		context.strokeRect(x, y, tileWidth, tileHeight);

		context.fillStyle = participant.cameraEnabled ? '#a5f3fc' : '#d4d4d4';
		context.font = compact ? '700 24px system-ui, sans-serif' : '700 38px system-ui, sans-serif';
		context.fillText(participant.cameraEnabled ? 'Camera on' : participant.displayName.slice(0, 1).toUpperCase(), x + 28, y + tileHeight / 2);

		context.fillStyle = '#ffffff';
		context.font = compact ? '700 20px system-ui, sans-serif' : '700 28px system-ui, sans-serif';
		context.fillText(participant.displayName, x + 28, y + tileHeight - 38);
		context.font = compact ? '500 15px system-ui, sans-serif' : '500 18px system-ui, sans-serif';
		context.fillStyle = '#d4d4d4';
		context.fillText(participant.role === 'host' ? 'Host' : 'Guest', x + 28, y + tileHeight - 14);
	}

	function drawBroadcastChrome(context: CanvasRenderingContext2D) {
		context.fillStyle = 'rgb(0 0 0 / 0.55)';
		context.fillRect(0, 0, width, 48);
		context.fillStyle = '#fef3c7';
		context.font = '700 20px system-ui, sans-serif';
		context.fillText('Backstage Broadcast Preview · Not live', 32, 32);
	}
</script>

<section class="rounded-md border border-neutral-300 bg-white p-5 shadow-sm" data-testid="composed-feed">
	<div class="flex flex-wrap items-start justify-between gap-3">
		<div>
			<p class="text-sm font-semibold uppercase tracking-[0.14em] text-neutral-500">
				Composed Room Feed
			</p>
			<h2 class="mt-1 text-2xl font-semibold">Canvas output</h2>
		</div>
		<p class="rounded-full bg-cyan-100 px-3 py-1 text-xs font-semibold text-cyan-950">
			{outputLabel}
		</p>
	</div>

	<div class="mt-4 overflow-hidden rounded-md border border-neutral-800 bg-neutral-950">
		<canvas
			class="aspect-video w-full"
			data-testid="composition-canvas"
			height={height}
			use:composeCanvas
			width={width}
		></canvas>
	</div>

	<dl class="mt-4 grid gap-3 text-sm sm:grid-cols-3">
		<div class="rounded-md bg-neutral-100 p-3">
			<dt class="font-semibold text-neutral-600">Stream</dt>
			<dd class="mt-1 font-semibold text-neutral-950" data-testid="capture-stream-status">
				{captureStatus}
			</dd>
		</div>
		<div class="rounded-md bg-neutral-100 p-3">
			<dt class="font-semibold text-neutral-600">Measured fps</dt>
			<dd
				bind:this={fpsDisplay}
				class="mt-1 font-semibold text-neutral-950"
				data-testid="composition-fps"
			>
				Measuring
			</dd>
		</div>
		<div class="rounded-md bg-neutral-100 p-3">
			<dt class="font-semibold text-neutral-600">Primary source</dt>
			<dd class="mt-1 font-semibold text-neutral-950" data-testid="composition-primary-source">
				{activeScreenShare ? 'Screen Share' : 'Participant grid'}
			</dd>
		</div>
		<div class="rounded-md bg-neutral-100 p-3">
			<dt class="font-semibold text-neutral-600">WHIP ingest</dt>
			<dd class="mt-1 font-semibold text-neutral-950" data-testid="whip-ingest-status">
				{whipStatus}
			</dd>
		</div>
	</dl>

	<p class="mt-3 text-sm leading-6 text-neutral-600">
		This canvas is the Milestone 1 prototype output that Milestone 2 will send to WHIP.
	</p>
</section>
