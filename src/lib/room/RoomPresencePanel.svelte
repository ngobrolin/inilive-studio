<script lang="ts">
	import { onMount } from 'svelte';
	import ComposedFeedCanvas from '$lib/room/ComposedFeedCanvas.svelte';
	import MediaConnectionPanel from '$lib/room/MediaConnectionPanel.svelte';
	import type {
		BroadcastHealthStatus,
		BroadcastIngestGrant,
		RoomBroadcastView,
	} from '$lib/server/broadcast-state';
	import type { MediaJoinGrant } from '$lib/server/media-join';
	import type { RoomChatMessage, RoomPresence, RoomScreenShare } from '$lib/server/room-presence';
	import { deserialize } from '$app/forms';
	import { requestScreenShareToggle } from '$lib/room/livekit-screen-share';

	let {
		presence,
		chatMessages,
		activeParticipantId,
		actionError = null,
		mediaGrant,
		broadcast,
		hostWhipIngestGrant,
		isProductRoom = false,
		hasLinkedYouTubeChannel = false,
		guestInvitePath = null,
	}: {
		presence: RoomPresence;
		chatMessages: RoomChatMessage[];
		activeParticipantId: string;
		actionError?: string | null;
		mediaGrant: MediaJoinGrant | null;
		broadcast: RoomBroadcastView;
		hostWhipIngestGrant: BroadcastIngestGrant | null;
		isProductRoom?: boolean;
		hasLinkedYouTubeChannel?: boolean;
		guestInvitePath?: string | null;
	} = $props();
	const visibleParticipants = $derived(
		presence.participants.filter((participant) => !participant.removed),
	);
	const hosts = $derived(visibleParticipants.filter((participant) => participant.role === 'host'));
	const guests = $derived(visibleParticipants.filter((participant) => participant.role === 'guest'));
	const previewParticipants = $derived(visibleParticipants.slice(0, 4));
	const activeParticipant = $derived(
		presence.participants.find((participant) => participant.id === activeParticipantId),
	);
	const activeHost = $derived(activeParticipant?.role === 'host' ? activeParticipant : null);
	const broadcastActionUrl = $derived(
		`?/broadcast&participant=${encodeURIComponent(activeParticipantId)}`,
	);
	const panelBaseClass = 'rounded-md border p-5 shadow-sm';
	const primaryButtonClass =
		'rounded-md bg-neutral-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-cyan-700 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-neutral-400';
	const signalButtonClass =
		'rounded-md bg-cyan-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-cyan-900 focus:outline-none focus:ring-2 focus:ring-cyan-700 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60';
	const secondaryButtonClass =
		'rounded-md border border-neutral-300 px-3 py-2 text-sm font-semibold text-neutral-950 transition hover:border-neutral-950 focus:outline-none focus:ring-2 focus:ring-cyan-700 focus:ring-offset-2';
	const dangerButtonClass =
		'rounded-md bg-rose-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-rose-800 focus:outline-none focus:ring-2 focus:ring-cyan-700 focus:ring-offset-2';
	const dangerSecondaryButtonClass =
		'rounded-md border border-rose-300 px-4 py-3 text-sm font-semibold text-rose-950 transition hover:border-rose-700 focus:outline-none focus:ring-2 focus:ring-cyan-700 focus:ring-offset-2';
	let liveBroadcastOverride = $state<RoomBroadcastView | null>(null);
	let activeScreenShareOverride = $state<RoomScreenShare | null | undefined>(undefined);
	let screenShareError = $state<string | null>(null);
	let screenShareBusy = $state(false);
	const liveBroadcast = $derived(liveBroadcastOverride ?? broadcast);
	const activeScreenShare = $derived(
		activeScreenShareOverride !== undefined
			? activeScreenShareOverride
			: presence.activeScreenShare,
	);
	const isBroadcasting = $derived(liveBroadcast.state === 'broadcasting');
	const isCountdown = $derived(liveBroadcast.state === 'countdown');
	let countdownTick = $state(Date.now());
	let completeCountdownForm = $state<HTMLFormElement | null>(null);
	let completeCountdownRequested = $state(false);
	const countdownSecondsRemaining = $derived(
		liveBroadcast.countdownEndsAt
			? Math.max(0, Math.ceil((liveBroadcast.countdownEndsAt - countdownTick) / 1_000))
			: 0,
	);
	const broadcastStateLabel = $derived(
		liveBroadcast.state === 'broadcasting'
			? 'Broadcasting'
			: liveBroadcast.state === 'countdown'
				? 'Broadcast Countdown'
			: liveBroadcast.state === 'ended'
				? 'Broadcast ended'
				: liveBroadcast.state === 'failed'
					? 'Broadcast failed'
					: 'Backstage',
	);
	const broadcastHealthLabel = $derived(
		liveBroadcast.health?.status === 'connected'
			? 'Connected'
			: liveBroadcast.health?.status === 'degraded'
				? 'Degraded'
				: liveBroadcast.health?.status === 'failed'
					? 'Failed'
					: liveBroadcast.health?.status === 'ended'
						? 'Ended'
						: 'Connecting',
	);
	const roomHeading = $derived(isProductRoom ? 'Backstage' : 'Room presence');
	const roomDescription = $derived(
		isProductRoom
			? 'Review participant readiness, the Broadcast Preview, media connection, and YouTube setup before the Audience sees anything.'
			: 'This prototype Room keeps presence ephemeral in memory. It is not persisted and it is not restored after restart.',
	);
	const participantSummary = $derived(`${hosts.length} Host · ${guests.length}/3 Guests`);
	const youtubeSummary = $derived(
		hasLinkedYouTubeChannel ? 'YouTube channel linked' : 'YouTube channel not linked',
	);
	const broadcastStatePanelClass = $derived(
		`mt-6 ${panelBaseClass} ${getBroadcastStatePanelTone(liveBroadcast.state)}`,
	);
	const broadcastHealthPanelClass = $derived(
		`mt-6 ${panelBaseClass} ${getBroadcastHealthPanelTone(liveBroadcast.health?.status)}`,
	);
	const broadcastStateDescription = $derived(getBroadcastStateDescription());

	function getBroadcastStatePanelTone(state: RoomBroadcastView['state']) {
		switch (state) {
			case 'countdown':
				return 'border-amber-300 bg-amber-50 text-amber-950';
			case 'broadcasting':
				return 'border-cyan-300 bg-cyan-50 text-cyan-950';
			case 'failed':
				return 'border-rose-300 bg-rose-50 text-rose-950';
			case 'ended':
			case 'backstage':
			default:
				return 'border-neutral-300 bg-white text-neutral-950';
		}
	}

	function getBroadcastHealthPanelTone(status: BroadcastHealthStatus | undefined) {
		switch (status) {
			case 'connected':
				return 'border-green-300 bg-green-50 text-green-950';
			case 'degraded':
				return 'border-amber-300 bg-amber-50 text-amber-950';
			case 'failed':
				return 'border-rose-300 bg-rose-50 text-rose-950';
			case 'ended':
				return 'border-neutral-300 bg-white text-neutral-950';
			default:
				return 'border-cyan-300 bg-cyan-50 text-cyan-950';
		}
	}

	function getBroadcastStateDescription() {
		if (liveBroadcast.state === 'failed' && liveBroadcast.failureMessage) {
			return liveBroadcast.failureMessage;
		}

		if (liveBroadcast.state === 'ended') {
			return 'The Broadcast ended and this Room returned to Backstage. Start a new Broadcast when you are ready.';
		}

		if (liveBroadcast.state === 'countdown') {
			return isProductRoom
				? 'The Broadcast Countdown is visible to everyone in this reusable Room. YouTube goes live when the Countdown reaches zero.'
				: 'The Broadcast Countdown is starting.';
		}

		if (liveBroadcast.state === 'backstage') {
			if (hasLinkedYouTubeChannel) {
				return 'Nothing is live to YouTube yet. The Host can start a managed YouTube Broadcast when the Room is ready.';
			}

			return 'Nothing is live to YouTube yet. Link a YouTube channel on the dashboard or paste ephemeral stream credentials for this Broadcast attempt.';
		}

		return 'The Composed Room Feed is live to the Broadcast Destination. Recording lives on YouTube in v1.';
	}

	async function submitScreenShareAction(action: 'start' | 'stop') {
		if (!activeHost || screenShareBusy) {
			return;
		}

		screenShareBusy = true;
		screenShareError = null;

		const mediaResult = await requestScreenShareToggle(action === 'start');
		if (!mediaResult.ok) {
			screenShareError = mediaResult.error ?? 'Screen Share failed.';
			screenShareBusy = false;
			return;
		}

		const formData = new FormData();
		formData.set('participantId', activeHost.id);
		formData.set('screenShareAction', action);

		const response = await fetch('?/screenShare', {
			method: 'POST',
			body: formData,
		});
		const result = deserialize(await response.text());

		if (result.type === 'failure') {
			if (action === 'start') {
				await requestScreenShareToggle(false);
			}
			screenShareError = String(result.data?.error ?? 'Screen Share failed.');
			screenShareBusy = false;
			return;
		}

		activeScreenShareOverride =
			action === 'start'
				? {
						participantId: activeHost.id,
						displayName: activeHost.displayName,
					}
				: null;
		screenShareBusy = false;
	}
	onMount(() => {
		const refreshBroadcastState = async () => {
			const response = await fetch(
				`/room/${encodeURIComponent(presence.roomId)}/broadcast-state?participant=${encodeURIComponent(activeParticipantId)}`,
			);
			if (response.ok) {
				liveBroadcastOverride = (await response.json()) as RoomBroadcastView;
			}
		};
		const interval = window.setInterval(() => {
			countdownTick = Date.now();
			void refreshBroadcastState();
		}, 250);

		return () => window.clearInterval(interval);
	});

	$effect(() => {
		if (!isCountdown) {
			completeCountdownRequested = false;
		}

		if (!activeHost || !isCountdown || !liveBroadcast.countdownEndsAt || completeCountdownRequested) {
			return;
		}

		const submitCompleteCountdown = () => {
			if (completeCountdownRequested) {
				return;
			}

			completeCountdownRequested = true;
			completeCountdownForm?.requestSubmit();
		};

		const remaining = liveBroadcast.countdownEndsAt - Date.now();
		if (remaining <= 0) {
			submitCompleteCountdown();
			return;
		}

		const timeout = window.setTimeout(submitCompleteCountdown, remaining);

		return () => window.clearTimeout(timeout);
	});
</script>

<main class="mx-auto flex min-h-screen max-w-6xl flex-col px-5 py-8 text-neutral-950">
	<header class="border-b border-neutral-300 pb-5">
		<p class="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">
			Backstage · Room {presence.roomId}
		</p>
		<h1 class="mt-2 text-4xl font-semibold">{roomHeading}</h1>
		<p class="mt-3 max-w-2xl text-lg leading-8 text-neutral-700">
			{roomDescription}
		</p>
		<div class="mt-5 flex flex-wrap gap-2 text-xs font-semibold">
			<p class="rounded-full bg-neutral-100 px-3 py-1 text-neutral-700">{participantSummary}</p>
			<p
				class="rounded-full px-3 py-1 {hasLinkedYouTubeChannel
					? 'bg-green-100 text-green-800'
					: 'bg-amber-100 text-amber-950'}"
			>
				{youtubeSummary}
			</p>
			<p
				class="rounded-full px-3 py-1 {isBroadcasting
					? 'bg-cyan-100 text-cyan-950'
					: 'bg-neutral-100 text-neutral-700'}"
			>
				{broadcastStateLabel}
			</p>
		</div>
	</header>

	{#if actionError}
		<p
			class="mt-6 rounded-md border border-rose-300 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-950"
			data-testid="action-error"
		>
			{actionError}
		</p>
	{/if}

	{#if activeHost && guestInvitePath}
		<section
			class="mt-6 {panelBaseClass} border-neutral-300 bg-white"
			data-testid="guest-invite-controls"
		>
			<p class="text-sm font-semibold uppercase tracking-[0.14em] text-neutral-500">Guest Invite</p>
			<p class="mt-2 text-sm leading-6 text-neutral-600">
				Share this link with Guests. The legacy <code class="font-mono text-xs">/invite/demo</code>
				path no longer works for product Rooms.
			</p>
			<label class="mt-4 block text-xs font-medium text-neutral-600">
				Guest Invite link
				<input
					class="mt-1 w-full rounded-md border border-neutral-300 bg-neutral-50 px-3 py-2 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-cyan-700"
					data-testid="guest-invite-link"
					readonly
					value={guestInvitePath}
				/>
			</label>
		</section>
	{/if}

	<section
		class="mt-6 {panelBaseClass} border-cyan-300 bg-cyan-50 text-cyan-950"
		data-testid="screen-share-status"
	>
		<p class="text-sm font-semibold uppercase tracking-[0.14em]">Screen Share</p>
		{#if activeScreenShare}
			<h2 class="mt-2 text-2xl font-semibold">
				{activeScreenShare.displayName} is sharing their screen.
			</h2>
			<p class="mt-2 text-sm leading-6">
				Screen Share is active and becomes the primary source for later Composed Room Feed work.
			</p>
		{:else}
			<h2 class="mt-2 text-2xl font-semibold">No Screen Share is active.</h2>
			<p class="mt-2 text-sm leading-6">
				Only the Host can start Screen Share from Backstage.
			</p>
		{/if}

		{#if activeHost}
			<div class="mt-4 flex flex-wrap gap-3">
				{#if activeScreenShare}
					<button
						class={signalButtonClass}
						disabled={screenShareBusy}
						onclick={() => void submitScreenShareAction('stop')}
						type="button"
					>
						Stop Screen Share
					</button>
				{:else}
					<button
						class={signalButtonClass}
						disabled={screenShareBusy}
						onclick={() => void submitScreenShareAction('start')}
						type="button"
					>
						Start Screen Share
					</button>
				{/if}
			</div>
			{#if screenShareError}
				<p class="mt-3 text-sm font-semibold text-rose-800">{screenShareError}</p>
			{/if}
		{/if}
	</section>

	<section
		aria-live="polite"
		class={broadcastStatePanelClass}
		data-testid="broadcast-state"
	>
		<p class="text-sm font-semibold uppercase tracking-[0.14em]">Broadcast State</p>
		<h2 class="mt-2 text-2xl font-semibold">{broadcastStateLabel}</h2>
		<p class="mt-2 text-sm leading-6">{broadcastStateDescription}</p>
		{#if activeHost && liveBroadcast.youtubeControlRoomUrl}
			<p class="mt-4 text-sm leading-6">
				<a
					class="font-semibold underline decoration-current underline-offset-4 focus:outline-none focus:ring-2 focus:ring-cyan-700 focus:ring-offset-2"
					data-testid="youtube-control-room-link"
					href={liveBroadcast.youtubeControlRoomUrl}
					rel="noreferrer"
					target="_blank"
				>
					Open this YouTube live event in Live Control Room
				</a>
				<span class="block opacity-80">
					Use this event-specific link for verification, not YouTube Studio's default stream-key page.
				</span>
			</p>
		{/if}
	</section>

	{#if activeHost && liveBroadcast.health}
		<section
			aria-live="polite"
			class={broadcastHealthPanelClass}
			data-testid="broadcast-health"
		>
			<p class="text-sm font-semibold uppercase tracking-[0.14em]">Broadcast Health</p>
			<h2 class="mt-2 text-2xl font-semibold">{broadcastHealthLabel}</h2>
			<p class="mt-2 text-sm leading-6">{liveBroadcast.health.message}</p>
		</section>
	{/if}

	{#if isCountdown}
		<section
			class="mt-6 rounded-md border border-amber-300 bg-amber-50 p-5 text-amber-950 shadow-sm"
			data-testid="broadcast-countdown"
		>
			<p class="text-sm font-semibold uppercase tracking-[0.14em]">Countdown</p>
			<p class="mt-2 text-4xl font-semibold tabular-nums">{countdownSecondsRemaining}</p>
			<p class="mt-2 text-sm leading-6">
				Going live in {countdownSecondsRemaining} second{countdownSecondsRemaining === 1 ? '' : 's'}.
			</p>
			{#if activeHost}
				<form class="mt-4" method="POST" action={broadcastActionUrl}>
					<input name="hostParticipantId" type="hidden" value={activeHost.id} />
					<button
						class="rounded-md border border-amber-400 px-4 py-3 text-sm font-semibold transition hover:border-amber-700 focus:outline-none focus:ring-2 focus:ring-cyan-700 focus:ring-offset-2"
						name="broadcastAction"
						type="submit"
						value="cancel-countdown"
					>
						Cancel Countdown
					</button>
				</form>
				<form bind:this={completeCountdownForm} class="hidden" method="POST" action={broadcastActionUrl}>
					<input name="hostParticipantId" type="hidden" value={activeHost.id} />
					<input name="broadcastAction" type="hidden" value="complete-countdown" />
				</form>
			{/if}
		</section>
	{/if}

	{#if activeHost}
		<section
			class="mt-6 {panelBaseClass} border-neutral-300 bg-white"
			data-testid="broadcast-controls"
		>
			<p class="text-sm font-semibold uppercase tracking-[0.14em] text-neutral-500">
				Broadcast controls
			</p>
			<h2 class="mt-1 text-2xl font-semibold">
				{hasLinkedYouTubeChannel ? 'Managed YouTube Broadcast' : 'YouTube stream credentials'}
			</h2>
			{#if hasLinkedYouTubeChannel}
				<p class="mt-2 text-sm leading-6 text-neutral-600">
					iniLive Studio will create a new YouTube live event and use YouTube-issued ingest
					credentials internally. You do not need to copy a Stream URL or Stream key from YouTube
					Studio.
				</p>
			{:else}
				<p class="mt-2 text-sm leading-6 text-neutral-600">
					Paste the RTMP server URL and stream key for this Broadcast attempt only. Credentials
					stay in memory and are not persisted or logged.
				</p>
			{/if}
			<p class="mt-2 text-sm leading-6 text-neutral-600">
				In v1, the YouTube archive is the recording. iniLive Studio does not store a separate copy.
			</p>

			{#if isBroadcasting}
				<div class="mt-4 flex flex-wrap gap-3">
					<form method="POST" action={broadcastActionUrl}>
						<input name="hostParticipantId" type="hidden" value={activeHost.id} />
						<button
							class={dangerButtonClass}
							name="broadcastAction"
							type="submit"
							value="end"
						>
							End Broadcast
						</button>
					</form>
					<form method="POST" action={broadcastActionUrl}>
						<input name="hostParticipantId" type="hidden" value={activeHost.id} />
						<button
							class={dangerSecondaryButtonClass}
							name="broadcastAction"
							type="submit"
							value="simulate-fail"
						>
							Simulate bridge failure
						</button>
					</form>
				</div>
			{:else if !isCountdown}
				<form class="mt-4 grid gap-4" method="POST" action={broadcastActionUrl}>
					<input name="hostParticipantId" type="hidden" value={activeHost.id} />
					{#if hasLinkedYouTubeChannel}
						<div class="rounded-md border border-cyan-200 bg-cyan-50 px-4 py-3 text-sm text-cyan-950">
							<p class="font-semibold">Ready for one-click YouTube setup.</p>
							<p class="mt-1 leading-6">
								Start will create a fresh YouTube live event for this Room and send the Composed Room
								Feed to that event.
							</p>
						</div>
					{:else}
						<div>
							<label class="block text-sm font-semibold" for="rtmp-server-url">RTMP server URL</label>
							<input
								class="mt-2 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-700"
								id="rtmp-server-url"
								name="rtmpServerUrl"
								placeholder="rtmp://a.rtmp.youtube.com/live2"
								type="url"
							/>
						</div>
						<div>
							<label class="block text-sm font-semibold" for="stream-key">Stream key</label>
							<input
								class="mt-2 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-700"
								id="stream-key"
								name="streamKey"
								placeholder="Paste the YouTube stream key"
								type="password"
							/>
						</div>
					{/if}
					<button
						class={primaryButtonClass}
						name="broadcastAction"
						type="submit"
						value="start"
					>
						{hasLinkedYouTubeChannel
							? 'Start YouTube Broadcast Countdown'
							: isProductRoom
								? 'Start Broadcast Countdown'
								: 'Start Broadcast'}
					</button>
				</form>
			{/if}
		</section>
	{/if}

	{#if activeParticipant?.removed}
		<section class="my-8 rounded-md border border-rose-300 bg-rose-50 p-6 text-rose-950 shadow-sm">
			<p class="text-sm font-semibold uppercase tracking-[0.14em]">Removed from Room</p>
			<h2 class="mt-2 text-3xl font-semibold">The Host removed you from this Room session.</h2>
			<p class="mt-3 max-w-2xl leading-7">
				This only affects the current Room session. It does not revoke the Guest Invite.
			</p>
		</section>
	{/if}

	{#if activeParticipant && !activeParticipant.removed && activeParticipant.role === 'guest'}
		<section class="grid gap-3 pt-6">
			{#if activeParticipant.hostMutedMicrophone}
				<div class="rounded-md border border-amber-300 bg-amber-100 px-4 py-3 text-sm font-semibold text-amber-950">
					The Host muted your microphone. You can unmute only after Host approval.
				</div>
			{/if}
			{#if activeParticipant.hostDisabledCamera}
				<div class="rounded-md border border-amber-300 bg-amber-100 px-4 py-3 text-sm font-semibold text-amber-950">
					The Host turned your camera off. Turn it back on only when the Host asks.
				</div>
			{/if}
			{#if activeParticipant.unmuteRequested}
				<form
					class="flex flex-wrap items-center justify-between gap-3 rounded-md border border-cyan-300 bg-cyan-50 px-4 py-3 text-sm text-cyan-950"
					method="POST"
					action="?/unmute"
				>
					<input name="participantId" type="hidden" value={activeParticipant.id} />
					<p class="font-semibold">The Host requested that you unmute your microphone.</p>
					<div class="flex gap-2">
						<button
							class={signalButtonClass}
							name="unmuteResponse"
							type="submit"
							value="accept"
						>
							Accept unmute request
						</button>
						<button
							class="rounded-md border border-cyan-300 px-3 py-2 font-semibold transition hover:border-cyan-950 focus:outline-none focus:ring-2 focus:ring-cyan-700 focus:ring-offset-2"
							name="unmuteResponse"
							type="submit"
							value="dismiss"
						>
							Dismiss
						</button>
					</div>
				</form>
			{/if}
		</section>
	{/if}

	<section class="grid gap-4 py-8 lg:grid-cols-[minmax(0,1fr)_24rem]">
		<section aria-labelledby="participant-grid-title" class="grid content-start gap-4">
			<div>
				<p class="text-sm font-semibold uppercase tracking-[0.14em] text-neutral-500">
					Collaboration view
				</p>
				<h2 id="participant-grid-title" class="mt-1 text-2xl font-semibold">
					Participant grid
				</h2>
			</div>

			<div class="grid items-start gap-4 md:grid-cols-2" data-testid="participant-grid">
				{#each visibleParticipants as participant (participant.id)}
					<article class="overflow-hidden rounded-md border border-neutral-300 bg-white shadow-sm">
						<div class="flex aspect-video items-center justify-center bg-neutral-950 text-white">
							{#if participant.cameraEnabled}
								<div class="text-center">
									<p class="text-sm uppercase tracking-[0.18em] text-cyan-200">Camera on</p>
									<p class="mt-2 max-w-full break-words px-3 text-2xl font-semibold">
										{participant.displayName}
									</p>
								</div>
							{:else}
								<div class="text-center" data-testid="camera-off-placeholder">
									<div
										class="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-neutral-800 text-2xl font-semibold"
									>
										{participant.displayName.slice(0, 1).toUpperCase()}
									</div>
									<p class="mt-3 max-w-full break-words px-3 text-2xl font-semibold">
										{participant.displayName}
									</p>
									<p class="mt-1 text-sm text-neutral-400">Camera off</p>
								</div>
							{/if}
						</div>
						<div class="flex items-center justify-between gap-3 p-4">
							<div class="min-w-0">
								<p class="break-words font-semibold">{participant.displayName}</p>
								<p class="text-sm text-neutral-600">
									{participant.role === 'host' ? 'Host' : 'Guest'}
								</p>
							</div>
							<div class="grid justify-items-end gap-2">
								<p
									class="rounded-full bg-neutral-100 px-3 py-1 text-xs font-semibold text-neutral-700"
								>
									{participant.microphoneEnabled ? 'Mic on' : 'Mic muted'}
								</p>
								{#if participant.hostMutedMicrophone}
									<p
										class="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-950"
									>
										Host-muted
									</p>
								{/if}
							</div>
						</div>
						{#if activeHost && participant.role === 'guest'}
							<form
								class="grid grid-cols-2 gap-2 border-t border-neutral-200 p-4 max-sm:grid-cols-1"
								method="POST"
								action="?/moderate"
							>
								<input name="hostParticipantId" type="hidden" value={activeHost.id} />
								<input name="guestParticipantId" type="hidden" value={participant.id} />
								<button
									class={secondaryButtonClass}
									name="moderationAction"
									type="submit"
									value="force-mute"
								>
									Force mute {participant.displayName}
								</button>
								<button
									class={secondaryButtonClass}
									name="moderationAction"
									type="submit"
									value="force-camera-off"
								>
									Force camera off {participant.displayName}
								</button>
								<button
									class={secondaryButtonClass}
									name="moderationAction"
									type="submit"
									value="request-unmute"
								>
									Request unmute from {participant.displayName}
								</button>
								<button
									class={dangerButtonClass}
									name="moderationAction"
									type="submit"
									value="remove"
								>
									Remove {participant.displayName}
								</button>
							</form>
						{/if}
					</article>
				{/each}
			</div>
		</section>

		<aside class="grid content-start gap-4">
			<ComposedFeedCanvas
				activeScreenShare={activeScreenShare}
				broadcast={liveBroadcast}
				{hostWhipIngestGrant}
				participants={visibleParticipants}
			/>

			<section
				class="rounded-md border border-neutral-300 bg-white p-5 shadow-sm"
				data-testid="broadcast-preview"
			>
				<div class="flex items-start justify-between gap-3">
					<div>
						<p class="text-sm font-semibold uppercase tracking-[0.14em] text-neutral-500">
							Backstage preview
						</p>
						<h2 class="mt-1 text-2xl font-semibold">Broadcast Preview</h2>
					</div>
					<p
						class="rounded-full px-3 py-1 text-xs font-semibold {isBroadcasting
							? 'bg-rose-100 text-rose-950'
							: 'bg-amber-100 text-amber-950'}"
					>
						{isBroadcasting ? 'Live' : 'Not live'}
					</p>
				</div>
				<div class="mt-4 overflow-hidden rounded-md bg-neutral-950 p-3 text-white">
					<div class="aspect-video">
						{#if activeScreenShare}
							<div class="flex h-full flex-col justify-between bg-cyan-950 p-4">
								<div>
									<p class="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-200">
										Screen Share source
									</p>
									<p class="mt-1 text-lg font-semibold">
										{activeScreenShare.displayName}
									</p>
								</div>
								<p class="text-xs text-cyan-100">
									Screen Share becomes primary in the composed feed.
								</p>
							</div>
						{:else}
							<div class="grid h-full grid-cols-2 gap-2">
								{#each previewParticipants as participant (participant.id)}
									<div
										class="flex min-h-0 flex-col justify-between rounded bg-neutral-800 p-2"
									>
										<div class="flex min-h-0 flex-1 items-center justify-center">
											{#if participant.cameraEnabled}
												<p class="text-xs font-semibold text-cyan-200">Camera on</p>
											{:else}
												<div class="text-center">
													<div
														class="mx-auto flex h-8 w-8 items-center justify-center rounded-full bg-neutral-700 text-sm font-semibold"
													>
														{participant.displayName.slice(0, 1).toUpperCase()}
													</div>
													<p class="mt-1 text-[0.7rem] text-neutral-300">Camera off</p>
												</div>
											{/if}
										</div>
										<div class="mt-2 flex items-center justify-between gap-2 text-xs">
											<p class="truncate font-semibold">{participant.displayName}</p>
											<p class="shrink-0 text-neutral-300">
												{participant.role === 'host' ? 'Host' : 'Guest'}
											</p>
										</div>
									</div>
								{/each}
							</div>
						{/if}
					</div>
				</div>
				<p class="mt-3 text-sm leading-6 text-neutral-600">
					{#if isBroadcasting}
						This Broadcast Preview shows what the Audience sees on YouTube while Broadcasting.
					{:else}
						This is the Room-visible Broadcast Preview while Backstage. It is not sent to a
						Broadcast Destination yet.
					{/if}
				</p>
			</section>

			<MediaConnectionPanel
				canScreenShare={activeParticipant?.role === 'host'}
				cameraEnabled={activeParticipant?.cameraEnabled ?? true}
				grant={mediaGrant}
				microphoneEnabled={activeParticipant?.microphoneEnabled ?? true}
				screenShareActive={activeScreenShare?.participantId === activeParticipant?.id}
			/>

			<section class="rounded-md border border-neutral-300 bg-white p-5 shadow-sm">
				<p class="text-sm font-semibold uppercase tracking-[0.14em] text-neutral-500">Capacity</p>
				<p class="mt-3 text-3xl font-semibold">{hosts.length} Host · {guests.length}/3 Guests</p>
				<p class="mt-4 text-sm leading-6 text-neutral-600">
					A fourth Guest sees Room Full instead of entering this Room.
				</p>
				<p class="mt-4 rounded-md bg-amber-100 px-3 py-2 text-sm font-semibold text-amber-950">
					{isBroadcasting ? 'Broadcasting to YouTube' : 'Backstage — not Broadcasting'}
				</p>
			</section>

			<section class="rounded-md border border-neutral-300 bg-white p-5 shadow-sm">
				<div class="flex items-center justify-between gap-3">
					<div>
						<p class="text-sm font-semibold uppercase tracking-[0.14em] text-neutral-500">
							Room Chat
						</p>
						<p class="mt-1 text-sm text-neutral-600">
							{activeParticipant
								? `Sending as ${activeParticipant.displayName}`
								: 'Enter through Join Check to send messages.'}
						</p>
					</div>
				</div>

				<div class="mt-4 grid max-h-72 gap-3 overflow-y-auto" data-testid="room-chat-messages">
					{#if chatMessages.length === 0}
						<p class="rounded-md bg-neutral-100 px-3 py-2 text-sm text-neutral-600">
							No Room Chat messages yet.
						</p>
					{:else}
						{#each chatMessages as message (message.id)}
							<article class="rounded-md bg-neutral-100 px-3 py-2">
								<p class="text-xs font-semibold uppercase tracking-[0.12em] text-neutral-500">
									{message.senderDisplayName} · {message.senderRole === 'host' ? 'Host' : 'Guest'}
								</p>
								<p class="mt-1 whitespace-pre-wrap text-sm leading-6 text-neutral-950">
									{message.text}
								</p>
							</article>
						{/each}
					{/if}
				</div>

				<form class="mt-4" method="POST" action="?/chat">
					<input name="participantId" type="hidden" value={activeParticipantId} />
					<label class="block text-sm font-semibold" for="room-chat-message">
						Room Chat message
					</label>
					<textarea
						class="mt-2 min-h-24 w-full resize-y rounded-md border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-700 disabled:bg-neutral-100"
						disabled={!activeParticipant}
						id="room-chat-message"
						name="messageText"
						placeholder="Message everyone in this Room"
					></textarea>
					<button
						class="mt-3 w-full {primaryButtonClass}"
						disabled={!activeParticipant}
						type="submit"
					>
						Send message
					</button>
				</form>
			</section>
		</aside>
	</section>
</main>
