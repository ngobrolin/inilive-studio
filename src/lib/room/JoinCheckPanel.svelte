<script lang="ts">
	import { hasDisplayName } from '$lib/room/display-name';
	import {
		attachLocalPreview,
		createMicrophoneLevelMonitor,
		isJoinCheckMediaSupported,
		listMediaDevices,
		requestLocalPreview,
		setCameraEnabled,
		setMicrophoneEnabled,
		stopLocalPreview,
		switchCameraDevice,
		switchMicrophoneDevice,
		type JoinCheckMediaStatus,
		type MediaDeviceLists,
	} from '$lib/room/join-check-media';
	import type { RoomEntryRole } from '$lib/room/entry-copy';
	import { onDestroy, onMount } from 'svelte';

	let {
		role,
		roomId,
	}: {
		role: RoomEntryRole;
		roomId: string;
	} = $props();

	let displayName = $state('');
	let mediaStatus = $state<JoinCheckMediaStatus>('loading');
	let previewVideo = $state<HTMLVideoElement | null>(null);
	let previewStream = $state<MediaStream | null>(null);
	let cameraEnabled = $state(true);
	let microphoneEnabled = $state(true);
	let mediaDevices = $state<MediaDeviceLists>({ cameras: [], microphones: [] });
	let selectedCameraId = $state('');
	let selectedMicrophoneId = $state('');
	let microphoneLevel = $state(0);

	const canEnter = $derived(hasDisplayName(displayName));
	const microphoneLevelPercent = $derived(Math.round(microphoneLevel * 100));

	function toggleCamera() {
		if (!previewStream) {
			return;
		}

		cameraEnabled = !cameraEnabled;
		setCameraEnabled(previewStream, cameraEnabled);
	}

	function toggleMicrophone() {
		if (!previewStream) {
			return;
		}

		microphoneEnabled = !microphoneEnabled;
		setMicrophoneEnabled(previewStream, microphoneEnabled);
	}

	onMount(async () => {
		if (!isJoinCheckMediaSupported()) {
			mediaStatus = 'unsupported';
			return;
		}

		try {
			previewStream = await requestLocalPreview();
		} catch (error) {
			if (error instanceof DOMException && error.name === 'NotFoundError') {
				mediaStatus = 'no-devices';
				return;
			}

			mediaStatus = 'permission-denied';
		}
	});

	$effect(() => {
		if (!previewVideo || !previewStream || mediaStatus === 'ready') {
			return;
		}

		attachLocalPreview(previewVideo, previewStream);
		mediaStatus = 'ready';
		void loadMediaDevices();
	});

	async function loadMediaDevices() {
		mediaDevices = await listMediaDevices();
		selectedCameraId = previewStream?.getVideoTracks()[0]?.getSettings().deviceId ?? mediaDevices.cameras[0]?.deviceId ?? '';
		selectedMicrophoneId =
			previewStream?.getAudioTracks()[0]?.getSettings().deviceId ??
			mediaDevices.microphones[0]?.deviceId ??
			'';
	}

	async function onCameraDeviceChange(event: Event) {
		const deviceId = (event.currentTarget as HTMLSelectElement).value;
		if (!previewStream || !deviceId) {
			return;
		}

		selectedCameraId = deviceId;
		previewStream = await switchCameraDevice(previewStream, deviceId);
		if (previewVideo) {
			attachLocalPreview(previewVideo, previewStream);
		}
		setCameraEnabled(previewStream, cameraEnabled);
	}

	async function onMicrophoneDeviceChange(event: Event) {
		const deviceId = (event.currentTarget as HTMLSelectElement).value;
		if (!previewStream || !deviceId) {
			return;
		}

		selectedMicrophoneId = deviceId;
		previewStream = await switchMicrophoneDevice(previewStream, deviceId);
		setMicrophoneEnabled(previewStream, microphoneEnabled);
	}

	$effect(() => {
		if (!previewStream || mediaStatus !== 'ready' || !microphoneEnabled) {
			microphoneLevel = 0;
			return;
		}

		const stopMonitoring = createMicrophoneLevelMonitor(previewStream, (level) => {
			microphoneLevel = level;
		});

		return () => {
			stopMonitoring();
		};
	});

	onDestroy(() => {
		stopLocalPreview(previewStream);
	});
</script>

<main class="mx-auto flex min-h-screen max-w-3xl flex-col px-5 py-8 text-neutral-950">
	<header class="border-b border-neutral-300 pb-5">
		<p class="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">
			{role === 'host' ? 'Host' : 'Guest'} · Room {roomId}
		</p>
		<h1 class="mt-2 text-4xl font-semibold">Join Check</h1>
		<p class="mt-3 max-w-xl text-lg leading-8 text-neutral-700">
			Type your Display Name and preview your camera and microphone before entering Backstage.
		</p>
	</header>

	<section class="py-8">
		{#if mediaStatus === 'unsupported'}
			<p class="rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950">
				This browser is not supported for Join Check. Use a Chromium-based desktop browser.
			</p>
		{:else if mediaStatus === 'permission-denied'}
			<p class="rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-950">
				Camera or microphone access was denied. Reload the page and allow permissions in your
				browser settings.
			</p>
		{:else if mediaStatus === 'no-devices'}
			<p class="rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-950">
				No camera or microphone was found. Connect a device and try again.
			</p>
			<button
				class="mt-3 rounded-md border border-neutral-300 px-4 py-2 text-sm font-semibold"
				onclick={() => location.reload()}
				type="button"
			>
				Retry
			</button>
		{:else}
			{#if mediaStatus === 'loading'}
				<p class="mb-3 text-sm text-neutral-600">Requesting camera and microphone access…</p>
			{/if}
			<div
				class="overflow-hidden rounded-md border border-neutral-300 bg-neutral-950"
				class:opacity-0={mediaStatus !== 'ready'}
			>
				<video
					bind:this={previewVideo}
					class="aspect-video w-full object-cover"
					data-testid="local-preview"
					muted
					playsinline
				></video>
			</div>
			{#if mediaStatus === 'ready'}
				<div class="mt-3 grid gap-3 sm:grid-cols-2">
					<label class="block text-sm font-semibold" for="camera-device">
						Camera
						<select
							class="mt-2 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
							id="camera-device"
							onchange={onCameraDeviceChange}
							value={selectedCameraId}
						>
							{#each mediaDevices.cameras as device (device.deviceId)}
								<option value={device.deviceId}>
									{device.label || 'Camera'}
								</option>
							{/each}
						</select>
					</label>
					<div>
						<label class="block text-sm font-semibold" for="microphone-device">
							Microphone
							<select
								class="mt-2 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
								id="microphone-device"
								onchange={onMicrophoneDeviceChange}
								value={selectedMicrophoneId}
							>
								{#each mediaDevices.microphones as device (device.deviceId)}
									<option value={device.deviceId}>
										{device.label || 'Microphone'}
									</option>
								{/each}
							</select>
						</label>
						<div
							aria-label="Microphone level"
							aria-valuemax={100}
							aria-valuemin={0}
							aria-valuenow={microphoneLevelPercent}
							class="mt-3"
							data-testid="microphone-level"
							role="meter"
						>
							<div class="h-2 overflow-hidden rounded-full bg-neutral-200">
								<div
									class="h-2 rounded-full bg-cyan-600 transition-[width] duration-75"
									style:width="{microphoneLevelPercent}%"
								></div>
							</div>
							<p class="mt-1 text-xs text-neutral-500">
								{microphoneEnabled
									? 'Speak to confirm your microphone level.'
									: 'Microphone is muted.'}
							</p>
						</div>
					</div>
				</div>
				<div class="mt-3 flex flex-wrap gap-3">
					<button
						class="rounded-md border border-neutral-300 px-4 py-2 text-sm font-semibold"
						onclick={toggleCamera}
						type="button"
					>
						{cameraEnabled ? 'Turn camera off' : 'Turn camera on'}
					</button>
					<button
						class="rounded-md border border-neutral-300 px-4 py-2 text-sm font-semibold"
						onclick={toggleMicrophone}
						type="button"
					>
						{microphoneEnabled ? 'Mute microphone' : 'Unmute microphone'}
					</button>
				</div>
			{/if}
		{/if}

		<label class="mt-6 block text-sm font-semibold" for="display-name">Display Name</label>
		<input
			class="mt-2 w-full rounded-md border border-neutral-300 px-4 py-3 text-base"
			bind:value={displayName}
			id="display-name"
			maxlength="50"
			name="displayName"
			placeholder="How you appear in the Room"
			type="text"
		/>

		<button
			class="mt-6 rounded-md bg-neutral-950 px-5 py-4 text-sm font-semibold text-white transition hover:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-cyan-700 disabled:cursor-not-allowed disabled:bg-neutral-400"
			disabled={!canEnter}
			type="button"
		>
			Enter Room
		</button>
	</section>
</main>
