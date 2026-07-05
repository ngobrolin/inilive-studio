<script lang="ts">
	import { hostRoomPath } from "$lib/room/entry-copy";
	import type { PageData } from "./$types";

	let { data }: { data: PageData } = $props();
	let title = $state("");
	let errorMessage = $state<string | null>(null);

	async function createRoom(event: SubmitEvent) {
		event.preventDefault();
		errorMessage = null;

		const response = await fetch("/rooms", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ title }),
		});

		if (response.status === 401) {
			window.location.href = "/login";
			return;
		}

		if (!response.ok) {
			errorMessage = "Could not create this Room right now.";
			return;
		}

		title = "";
		window.location.reload();
	}

	async function regenerateGuestInvite(roomId: string) {
		const response = await fetch(`/rooms/${roomId}/invite`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ action: "regenerate" }),
		});

		if (response.status === 401) {
			window.location.href = "/login";
			return;
		}

		if (!response.ok) {
			errorMessage = "Could not update this Guest Invite right now.";
			return;
		}

		const body = (await response.json()) as { guestInviteToken?: string };
		if (body.guestInviteToken) {
			data = {
				...data,
				rooms: data.rooms.map((room) =>
					room.id === roomId ? { ...room, guestInviteToken: body.guestInviteToken! } : room,
				),
			};
		}
	}

	function guestInviteUrl(roomId: string, token: string) {
		return `/room/${roomId}/invite/${token}`;
	}
</script>

<main class="min-h-screen bg-neutral-100 px-5 py-6 text-neutral-950">
	<div class="mx-auto grid max-w-7xl gap-6">
		<header class="rounded-lg border border-neutral-300 bg-white p-5 shadow-sm">
			<div class="flex flex-wrap items-start justify-between gap-5">
				<div>
					<p class="text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500">
						Host dashboard
					</p>
					<h1 class="mt-2 text-3xl font-semibold tracking-normal">Host dashboard</h1>
					<p class="mt-2 max-w-3xl text-sm leading-6 text-neutral-600">
						Signed in as {data.hostEmail}. Pick a reusable Room, confirm YouTube readiness,
						and bring Guests into Backstage before anything reaches a Broadcast Destination.
					</p>
				</div>
				<div class="flex flex-wrap gap-2 text-xs font-semibold">
					<p class="rounded-full bg-neutral-100 px-3 py-1 text-neutral-700">
						{data.rooms.length} Room{data.rooms.length === 1 ? '' : 's'}
					</p>
					<p
						class="rounded-full px-3 py-1 {data.youtubeChannel
							? 'bg-green-100 text-green-800'
							: 'bg-amber-100 text-amber-950'}"
					>
						{data.youtubeChannel ? 'YouTube linked' : 'YouTube not linked'}
					</p>
				</div>
			</div>
		</header>

	{#if data.youtubeLinkStatus === "linked"}
		<p class="rounded-md border border-green-300 bg-green-50 px-4 py-3 text-sm font-semibold text-green-900">
			YouTube channel linked.
		</p>
	{:else if data.youtubeLinkStatus === "link-failed"}
		<p class="rounded-md border border-rose-300 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-950">
			YouTube channel linking failed. Please try again.
		</p>
	{:else if data.youtubeLinkStatus === "unlinked"}
		<p class="rounded-md border border-green-300 bg-green-50 px-4 py-3 text-sm font-semibold text-green-900">
			YouTube channel unlinked and Google access revoked.
		</p>
	{:else if data.youtubeLinkStatus === "unlinked-stale"}
		<p class="rounded-md border border-green-300 bg-green-50 px-4 py-3 text-sm font-semibold text-green-900">
			YouTube channel unlinked. The stored Google authorization was already invalid, so you can
			link the channel again.
		</p>
	{:else if data.youtubeLinkStatus === "not-linked"}
		<p class="rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-950">
			No linked YouTube channel was found. Link a channel before trying to unlink it.
		</p>
	{:else if data.youtubeLinkStatus === "unlink-failed"}
		<p class="rounded-md border border-rose-300 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-950">
			Could not revoke Google access. The channel remains linked; please try again.
		</p>
	{:else if data.youtubeLinkStatus === "unlink-cleanup-failed"}
		<p class="rounded-md border border-rose-300 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-950">
			Google access was revoked, but iniLive Studio could not remove the saved channel link. Please
			try again or contact support.
		</p>
	{/if}

		<div class="grid gap-6 lg:grid-cols-[minmax(0,1fr)_24rem]">
			<section class="grid gap-6">
				<section class="rounded-lg border border-neutral-300 bg-white shadow-sm">
					<div class="flex flex-wrap items-start justify-between gap-4 border-b border-neutral-200 px-5 py-4">
						<div>
							<p class="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">
								Rooms
							</p>
							<h2 class="mt-1 text-xl font-semibold">Reusable production Rooms</h2>
						</div>
						<p class="rounded-full bg-cyan-50 px-3 py-1 text-xs font-semibold text-cyan-950">
							Guest Invites active per Room
						</p>
					</div>
					<div class="p-5">
						{#if data.rooms.length === 0}
							<div class="rounded-md border border-dashed border-neutral-300 bg-neutral-50 px-4 py-8 text-center">
								<h3 class="font-semibold">No Rooms yet.</h3>
								<p class="mt-2 text-sm text-neutral-600">
									Create the first reusable Room to open Join Check, Backstage, and Broadcast setup.
								</p>
							</div>
						{:else}
							<ul class="grid gap-3">
								{#each data.rooms as room (room.id)}
									<li>
										<div class="rounded-md border border-neutral-200 bg-white p-4">
											<div class="flex flex-wrap items-start justify-between gap-4">
												<a
													class="min-w-0 transition hover:text-neutral-600 focus:outline-none focus:ring-2 focus:ring-cyan-700 focus:ring-offset-2"
													href={hostRoomPath(room.id)}
												>
													<p class="break-words font-semibold">{room.title}</p>
													<p class="mt-1 font-mono text-xs text-neutral-500">Room id: {room.id}</p>
												</a>
												<a
													class="rounded-md bg-neutral-950 px-3 py-2 text-sm font-semibold text-white transition hover:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-cyan-700 focus:ring-offset-2"
													href={hostRoomPath(room.id)}
												>
													Open Backstage
												</a>
											</div>
											<label class="mt-4 block text-xs font-semibold text-neutral-600">
												Guest Invite link for {room.title}
												<input
													class="mt-1 w-full rounded-md border border-neutral-300 bg-neutral-50 px-3 py-2 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-cyan-700"
													readonly
													value={guestInviteUrl(room.id, room.guestInviteToken)}
												/>
											</label>
											<button
												class="mt-3 rounded-md border border-neutral-300 px-3 py-2 text-xs font-semibold text-neutral-950 transition hover:border-neutral-950 focus:outline-none focus:ring-2 focus:ring-cyan-700 focus:ring-offset-2"
												type="button"
												onclick={() => regenerateGuestInvite(room.id)}
											>
												Regenerate Guest Invite for {room.title}
											</button>
										</div>
									</li>
								{/each}
							</ul>
						{/if}
					</div>
				</section>
			</section>

			<aside class="grid content-start gap-6">
				<section class="rounded-lg border border-neutral-300 bg-white p-5 shadow-sm">
					<p class="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">
						Create Room
					</p>
					<h2 class="mt-1 text-xl font-semibold">Prepare a new Backstage</h2>
					<form class="mt-4 grid gap-3" onsubmit={createRoom}>
						<label class="text-sm font-semibold text-neutral-700">
							Room Title
							<input
								class="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-700"
								type="text"
								name="title"
								bind:value={title}
								required
								maxlength="100"
								placeholder="Weekly show"
							/>
						</label>
						<button
							class="rounded-md bg-neutral-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-cyan-700 focus:ring-offset-2"
							type="submit"
						>
							Create Room
						</button>
					</form>
					{#if errorMessage}
						<p class="mt-3 text-sm font-semibold text-rose-800">{errorMessage}</p>
					{/if}
				</section>

				<section class="rounded-lg border border-neutral-300 bg-white p-5 shadow-sm">
					<div class="flex items-start justify-between gap-3">
						<div>
							<p class="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">
								Broadcast setup
							</p>
							<h2 class="mt-1 text-xl font-semibold">YouTube channel</h2>
						</div>
						<p
							class="rounded-full px-3 py-1 text-xs font-semibold {data.youtubeChannel
								? 'bg-green-100 text-green-800'
								: 'bg-amber-100 text-amber-950'}"
						>
							{data.youtubeChannel ? 'Ready' : 'Action needed'}
						</p>
					</div>
					{#if data.youtubeChannel}
						<p class="mt-3 text-sm leading-6 text-neutral-600">
							Linked as <strong>{data.youtubeChannel.title}</strong>. Unlinking revokes iniLive
							Studio's Google access and removes the stored channel link.
						</p>
						<form class="mt-4" method="POST" action="/youtube/unlink">
							<button
								class="rounded-md border border-rose-300 px-4 py-3 text-sm font-semibold text-rose-950 transition hover:border-rose-700 focus:outline-none focus:ring-2 focus:ring-cyan-700 focus:ring-offset-2"
								type="submit"
							>
								Unlink YouTube channel
							</button>
						</form>
					{:else}
						<p class="mt-3 text-sm leading-6 text-neutral-600">
							Link the Host YouTube channel used for managed Broadcasts. Google will ask for YouTube
							permission before returning to iniLive Studio.
						</p>
						<form class="mt-4" method="POST" action="/youtube/link">
							<button
								class="rounded-md bg-red-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-cyan-700 focus:ring-offset-2"
								type="submit"
							>
								Link YouTube channel
							</button>
						</form>
					{/if}
				</section>

				<section class="rounded-lg border border-cyan-300 bg-cyan-50 p-5 text-cyan-950 shadow-sm">
					<p class="text-xs font-semibold uppercase tracking-[0.14em]">Next action</p>
					<h2 class="mt-1 text-xl font-semibold">Open a Room when Guests are ready</h2>
					<p class="mt-3 text-sm leading-6">
						Backstage now carries Broadcast Preview, Guest readiness, Screen Share, Room Chat, and
						Broadcast controls in one operational workspace.
					</p>
				</section>
			</aside>
		</div>
	</div>
</main>
