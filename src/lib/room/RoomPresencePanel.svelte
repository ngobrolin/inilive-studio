<script lang="ts">
	import MediaConnectionPanel from '$lib/room/MediaConnectionPanel.svelte';
	import type { MediaJoinGrant } from '$lib/server/media-join';
	import type { RoomChatMessage, RoomPresence } from '$lib/server/room-presence';

	let {
		presence,
		chatMessages,
		activeParticipantId,
		mediaGrant,
	}: {
		presence: RoomPresence;
		chatMessages: RoomChatMessage[];
		activeParticipantId: string;
		mediaGrant: MediaJoinGrant | null;
	} = $props();
	const hosts = $derived(presence.participants.filter((participant) => participant.role === 'host'));
	const guests = $derived(presence.participants.filter((participant) => participant.role === 'guest'));
	const activeParticipant = $derived(
		presence.participants.find((participant) => participant.id === activeParticipantId),
	);
</script>

<main class="mx-auto flex min-h-screen max-w-6xl flex-col px-5 py-8 text-neutral-950">
	<header class="border-b border-neutral-300 pb-5">
		<p class="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">
			Backstage · Room {presence.roomId}
		</p>
		<h1 class="mt-2 text-4xl font-semibold">Room presence</h1>
		<p class="mt-3 max-w-2xl text-lg leading-8 text-neutral-700">
			This prototype Room keeps presence ephemeral in memory. It is not persisted and it is not
			restored after restart.
		</p>
	</header>

	<section class="grid gap-4 py-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
		<div class="grid items-start gap-4 md:grid-cols-2">
			{#each presence.participants as participant (participant.id)}
				<article class="overflow-hidden rounded-md border border-neutral-300 bg-white shadow-sm">
					<div class="flex aspect-video items-center justify-center bg-neutral-950 text-white">
						{#if participant.cameraEnabled}
							<div class="text-center">
								<p class="text-sm uppercase tracking-[0.18em] text-cyan-200">Camera on</p>
								<p class="mt-2 text-2xl font-semibold">{participant.displayName}</p>
							</div>
						{:else}
							<div class="text-center" data-testid="camera-off-placeholder">
								<div class="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-neutral-800 text-2xl font-semibold">
									{participant.displayName.slice(0, 1).toUpperCase()}
								</div>
								<p class="mt-3 text-2xl font-semibold">{participant.displayName}</p>
								<p class="mt-1 text-sm text-neutral-400">Camera off</p>
							</div>
						{/if}
					</div>
					<div class="flex items-center justify-between gap-3 p-4">
						<div>
							<p class="font-semibold">{participant.displayName}</p>
							<p class="text-sm text-neutral-600">{participant.role === 'host' ? 'Host' : 'Guest'}</p>
						</div>
						<p class="rounded-full bg-neutral-100 px-3 py-1 text-xs font-semibold text-neutral-700">
							{participant.microphoneEnabled ? 'Mic on' : 'Mic muted'}
						</p>
					</div>
				</article>
			{/each}
		</div>

		<aside class="grid content-start gap-4">
			<MediaConnectionPanel
				cameraEnabled={activeParticipant?.cameraEnabled ?? true}
				grant={mediaGrant}
				microphoneEnabled={activeParticipant?.microphoneEnabled ?? true}
			/>

			<section class="rounded-md border border-neutral-300 bg-white p-5 shadow-sm">
				<p class="text-sm font-semibold uppercase tracking-[0.14em] text-neutral-500">Capacity</p>
				<p class="mt-3 text-3xl font-semibold">{hosts.length} Host · {guests.length}/3 Guests</p>
				<p class="mt-4 text-sm leading-6 text-neutral-600">
					A fourth Guest sees Room Full instead of entering this Room.
				</p>
				<p class="mt-4 rounded-md bg-amber-100 px-3 py-2 text-sm font-semibold text-amber-950">
					Backstage — not Broadcasting
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

				<form class="mt-4" method="POST">
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
						class="mt-3 w-full rounded-md bg-neutral-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-cyan-700 disabled:cursor-not-allowed disabled:bg-neutral-400"
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
