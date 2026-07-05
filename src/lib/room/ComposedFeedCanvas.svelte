<script lang="ts">
	import { onDestroy } from 'svelte';
	import type { BroadcastIngestGrant, RoomBroadcastView } from '$lib/server/broadcast-state';
	import type { RoomParticipant, RoomScreenShare } from '$lib/server/room-presence';
	import { startCompositorClock } from './compositor-clock';
	import { createCompleteWhipOfferSdp, preferPlainWhipCodecs } from './whip-offer';
	import { getAudioSources, getVideoSource, subscribeAudioSources } from './media-registry';

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
	let audioDestination: MediaStreamAudioDestinationNode | null = null;
	let audioSourceNodes: MediaStreamAudioSourceNode[] = [];
	let silentOscillator: OscillatorNode | null = null;
	let unsubscribeAudio: (() => void) | null = null;
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

		}

		const compositorClock = startCompositorClock({ draw, frameRate: 30 });

		return {
			destroy() {
				compositorClock.stop();
			},
		};
	}

	onDestroy(() => {
		stopWhipPublisher();
		unsubscribeAudio?.();
		for (const node of audioSourceNodes) {
			node.disconnect();
		}
		audioSourceNodes = [];
		silentOscillator?.stop();
		for (const track of capture.stream?.getTracks() ?? []) {
			track.stop();
		}
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
		const audioTrack = ensureMixedAudioTrack();
		if (audioTrack) {
			nextStream.addTrack(audioTrack);
		}
		return nextStream;
	}

	// One long-lived mixed audio track is added to the captured stream before WHIP
	// starts. We rebuild the source-node connections when participant audio
	// changes, but never swap the published track, so the WHIP sender stays valid.
	function ensureMixedAudioTrack(): MediaStreamTrack | null {
		if (typeof AudioContext === 'undefined') {
			return null;
		}

		if (!audioContext) {
			audioContext = new AudioContext();
			audioDestination = audioContext.createMediaStreamDestination();

			const silentGain = audioContext.createGain();
			silentGain.gain.value = 0;
			silentOscillator = audioContext.createOscillator();
			silentOscillator.connect(silentGain).connect(audioDestination);
			silentOscillator.start();

			void audioContext.resume().catch(() => {});
			unsubscribeAudio = subscribeAudioSources(rebuildAudioMix);
			rebuildAudioMix();
		}

		return audioDestination?.stream.getAudioTracks()[0] ?? null;
	}

	function rebuildAudioMix() {
		if (!audioContext || !audioDestination) {
			return;
		}

		for (const node of audioSourceNodes) {
			node.disconnect();
		}
		audioSourceNodes = [];

		for (const track of getAudioSources()) {
			if (track.readyState !== 'live') {
				continue;
			}
			const source = audioContext.createMediaStreamSource(new MediaStream([track]));
			source.connect(audioDestination);
			audioSourceNodes.push(source);
		}

		void audioContext.resume().catch(() => {});
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
			for (const track of input.composedStream.getTracks()) {
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

	function isDrawableVideo(video: HTMLVideoElement | null): video is HTMLVideoElement {
		return (
			!!video &&
			video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA &&
			video.videoWidth > 0 &&
			video.videoHeight > 0
		);
	}

	function drawVideoCover(
		context: CanvasRenderingContext2D,
		video: HTMLVideoElement,
		x: number,
		y: number,
		boxWidth: number,
		boxHeight: number,
	) {
		const scale = Math.max(boxWidth / video.videoWidth, boxHeight / video.videoHeight);
		const sourceWidth = boxWidth / scale;
		const sourceHeight = boxHeight / scale;
		const sourceX = (video.videoWidth - sourceWidth) / 2;
		const sourceY = (video.videoHeight - sourceHeight) / 2;
		context.drawImage(
			video,
			sourceX,
			sourceY,
			sourceWidth,
			sourceHeight,
			x,
			y,
			boxWidth,
			boxHeight,
		);
	}

	function drawVideoContain(
		context: CanvasRenderingContext2D,
		video: HTMLVideoElement,
		x: number,
		y: number,
		boxWidth: number,
		boxHeight: number,
	) {
		const scale = Math.min(boxWidth / video.videoWidth, boxHeight / video.videoHeight);
		const drawWidth = video.videoWidth * scale;
		const drawHeight = video.videoHeight * scale;
		const offsetX = x + (boxWidth - drawWidth) / 2;
		const offsetY = y + (boxHeight - drawHeight) / 2;
		context.fillStyle = '#000000';
		context.fillRect(x, y, boxWidth, boxHeight);
		context.drawImage(video, offsetX, offsetY, drawWidth, drawHeight);
	}

	function drawFrame(context: CanvasRenderingContext2D, now: number) {
		context.fillStyle = '#0a0a0a';
		context.fillRect(0, 0, width, height);

		if (activeScreenShare) {
			drawScreenShareLayout(context, activeScreenShare, visibleParticipants, now);
		} else {
			drawParticipantGrid(context, visibleParticipants);
		}
	}

	function drawScreenShareLayout(
		context: CanvasRenderingContext2D,
		screenShare: RoomScreenShare,
		roomParticipants: RoomParticipant[],
		now: number,
	) {
		const screenVideo = getVideoSource(screenShare.participantId, 'screen');
		if (isDrawableVideo(screenVideo)) {
			drawVideoContain(context, screenVideo, 32, 32, 1216, 536);
			context.strokeStyle = '#67e8f9';
			context.lineWidth = 4;
			context.strokeRect(32, 32, 1216, 536);

			context.fillStyle = 'rgb(0 0 0 / 0.55)';
			context.fillRect(32, 32, 1216, 56);
			context.fillStyle = '#ecfeff';
			context.font = '700 32px system-ui, sans-serif';
			context.fillText(`${screenShare.displayName} Screen Share`, 56, 72);
		} else {
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
		}

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
		const cameraVideo = participant.cameraEnabled ? getVideoSource(participant.id, 'camera') : null;

		if (isDrawableVideo(cameraVideo)) {
			drawVideoCover(context, cameraVideo, x, y, tileWidth, tileHeight);
		} else {
			context.fillStyle = participant.cameraEnabled ? '#164e63' : '#171717';
			context.fillRect(x, y, tileWidth, tileHeight);

			context.fillStyle = participant.cameraEnabled ? '#a5f3fc' : '#d4d4d4';
			context.font = compact ? '700 24px system-ui, sans-serif' : '700 38px system-ui, sans-serif';
			context.fillText(
				participant.cameraEnabled
					? 'Camera on'
					: participant.displayName.slice(0, 1).toUpperCase(),
				x + 28,
				y + tileHeight / 2,
			);
		}

		context.strokeStyle = '#404040';
		context.lineWidth = 2;
		context.strokeRect(x, y, tileWidth, tileHeight);

		// Name label overlay so the composed feed still identifies participants on
		// top of live video.
		const labelHeight = compact ? 44 : 64;
		context.fillStyle = 'rgb(0 0 0 / 0.55)';
		context.fillRect(x, y + tileHeight - labelHeight, tileWidth, labelHeight);

		context.fillStyle = '#ffffff';
		context.font = compact ? '700 20px system-ui, sans-serif' : '700 28px system-ui, sans-serif';
		context.fillText(participant.displayName, x + 28, y + tileHeight - 38);
		context.font = compact ? '500 15px system-ui, sans-serif' : '500 18px system-ui, sans-serif';
		context.fillStyle = '#d4d4d4';
		context.fillText(participant.role === 'host' ? 'Host' : 'Guest', x + 28, y + tileHeight - 14);
	}

</script>

<section class="rounded-lg border border-neutral-800 bg-neutral-950 p-4 text-white shadow-sm" data-testid="composed-feed">
	<div class="flex flex-wrap items-start justify-between gap-3">
		<div>
			<p class="text-sm font-semibold uppercase tracking-[0.14em] text-neutral-400">
				Composed Room Feed
			</p>
			<h2 class="mt-1 text-2xl font-semibold">Canvas output</h2>
		</div>
		<p class="rounded-full bg-cyan-100 px-3 py-1 text-xs font-semibold text-cyan-950">
			{outputLabel}
		</p>
	</div>

	<div class="mt-4 overflow-hidden rounded-md border border-neutral-700 bg-black">
		<canvas
			class="aspect-video w-full"
			data-testid="composition-canvas"
			height={height}
			use:composeCanvas
			width={width}
		></canvas>
	</div>

	<dl class="mt-4 grid gap-3 text-sm sm:grid-cols-3">
		<div class="rounded-md border border-white/10 bg-white/5 p-3">
			<dt class="font-semibold text-neutral-300">Stream</dt>
			<dd class="mt-1 font-semibold text-white" data-testid="capture-stream-status">
				{captureStatus}
			</dd>
		</div>
		<div class="rounded-md border border-white/10 bg-white/5 p-3">
			<dt class="font-semibold text-neutral-300">Measured fps</dt>
			<dd
				bind:this={fpsDisplay}
				class="mt-1 font-semibold text-white"
				data-testid="composition-fps"
			>
				Measuring
			</dd>
		</div>
		<div class="rounded-md border border-white/10 bg-white/5 p-3">
			<dt class="font-semibold text-neutral-300">Primary source</dt>
			<dd class="mt-1 font-semibold text-white" data-testid="composition-primary-source">
				{activeScreenShare ? 'Screen Share' : 'Participant grid'}
			</dd>
		</div>
		<div class="rounded-md border border-white/10 bg-white/5 p-3">
			<dt class="font-semibold text-neutral-300">WHIP ingest</dt>
			<dd class="mt-1 font-semibold text-white" data-testid="whip-ingest-status">
				{whipStatus}
			</dd>
		</div>
	</dl>

	<p class="mt-3 text-sm leading-6 text-neutral-300">
		This canvas is the Room feed used for Broadcast Preview and WHIP ingest.
	</p>
</section>
