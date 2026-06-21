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

<main class="mx-auto flex min-h-screen max-w-3xl flex-col px-6 py-12">
	<h1 class="text-3xl font-semibold">Host dashboard</h1>
	<p class="mt-2 text-sm text-slate-600">
		Signed in as {data.hostEmail}. Room Titles are for your organization only and are not public
		broadcast metadata.
	</p>
	{#if data.youtubeLinkStatus === "linked"}
		<p class="mt-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
			YouTube channel linked.
		</p>
	{:else if data.youtubeLinkStatus === "link-failed"}
		<p class="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
			YouTube channel linking failed. Please try again.
		</p>
	{/if}

	<section class="mt-8 rounded-xl border border-slate-200 p-6">
		<h2 class="text-lg font-medium">YouTube channel</h2>
		<p class="mt-2 text-sm text-slate-600">
			Link the Host YouTube channel used for managed Broadcasts. Google will ask for YouTube
			permission before returning to Live Studio.
		</p>
		<form class="mt-4" method="POST" action="/youtube/link">
			<button class="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white" type="submit">
				Link YouTube channel
			</button>
		</form>
	</section>

	<section class="mt-8 rounded-xl border border-slate-200 p-6">
		<h2 class="text-lg font-medium">Create a Room</h2>
		<form class="mt-4 flex flex-col gap-3 sm:flex-row" onsubmit={createRoom}>
			<label class="flex-1 text-sm font-medium text-slate-700">
				Room Title
				<input
					class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
					type="text"
					name="title"
					bind:value={title}
					required
					maxlength="100"
					placeholder="Weekly show"
				/>
			</label>
			<button
				class="self-end rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white"
				type="submit"
			>
				Create Room
			</button>
		</form>
		{#if errorMessage}
			<p class="mt-3 text-sm text-red-700">{errorMessage}</p>
		{/if}
	</section>

	<section class="mt-8">
		<h2 class="text-lg font-medium">Your Rooms</h2>
		{#if data.rooms.length === 0}
			<p class="mt-3 text-sm text-slate-600">No Rooms yet. Create your first reusable Room above.</p>
		{:else}
			<ul class="mt-4 space-y-3">
				{#each data.rooms as room (room.id)}
					<li>
						<div class="rounded-xl border border-slate-200 px-4 py-3">
							<a
								class="block transition hover:text-slate-600"
								href={hostRoomPath(room.id)}
							>
								<p class="font-medium">{room.title}</p>
								<p class="mt-1 text-xs text-slate-500">Room id: {room.id}</p>
							</a>
							<label class="mt-3 block text-xs font-medium text-slate-600">
								Guest Invite link for {room.title}
								<input
									class="mt-1 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 font-mono text-xs"
									readonly
									value={guestInviteUrl(room.id, room.guestInviteToken)}
								/>
							</label>
							<button
								class="mt-3 rounded-lg border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700"
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
	</section>
</main>
