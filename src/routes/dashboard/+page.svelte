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
</script>

<main class="mx-auto flex min-h-screen max-w-3xl flex-col px-6 py-12">
	<h1 class="text-3xl font-semibold">Host dashboard</h1>
	<p class="mt-2 text-sm text-slate-600">
		Signed in as {data.hostEmail}. Room Titles are for your organization only and are not public
		broadcast metadata.
	</p>

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
						<a
							class="block rounded-xl border border-slate-200 px-4 py-3 transition hover:border-slate-400 hover:bg-slate-50"
							href={hostRoomPath(room.id)}
						>
							<p class="font-medium">{room.title}</p>
							<p class="mt-1 text-xs text-slate-500">Room id: {room.id}</p>
						</a>
					</li>
				{/each}
			</ul>
		{/if}
	</section>
</main>
