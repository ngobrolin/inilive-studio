<script lang="ts">
	import { roomEntryCopy, type RoomEntryRole } from '$lib/room/entry-copy';

	let {
		role,
		roomId,
		hostHref,
		guestHref,
		joinHref,
	}: {
		role: RoomEntryRole;
		roomId: string;
		hostHref: string;
		guestHref: string;
		joinHref: string;
	} = $props();

	const copy = $derived(roomEntryCopy(role));
</script>

<main class="mx-auto flex min-h-screen max-w-6xl flex-col px-5 py-8 text-neutral-950">
	<header class="flex flex-wrap items-center justify-between gap-4 border-b border-neutral-300 pb-5">
		<div>
			<p class="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">
				Room starts Backstage
			</p>
			<h1 class="mt-2 text-4xl font-semibold">Choose a Room entry path</h1>
		</div>
		<nav class="flex rounded-md border border-neutral-300 bg-white p-1" aria-label="Room role">
			<a
				class="rounded px-4 py-2 text-sm font-semibold data-[active=true]:bg-neutral-950 data-[active=true]:text-white"
				data-active={role === 'host'}
				href={hostHref}
			>
				Host
			</a>
			<a
				class="rounded px-4 py-2 text-sm font-semibold data-[active=true]:bg-neutral-950 data-[active=true]:text-white"
				data-active={role === 'guest'}
				href={guestHref}
			>
				Guest
			</a>
		</nav>
	</header>

	<div class="grid flex-1 items-center gap-8 py-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
		<section class="space-y-6">
			<div>
				<p class="text-sm font-semibold uppercase tracking-[0.14em] text-cyan-700">
					{copy.eyebrow}
				</p>
				<h2 class="mt-3 text-5xl font-semibold leading-none">{copy.title}</h2>
				<p class="mt-5 max-w-xl text-lg leading-8 text-neutral-700">{copy.body}</p>
			</div>

			<div class="grid gap-3 sm:grid-cols-2">
				<a
					class="rounded-md bg-neutral-950 px-5 py-4 text-center text-sm font-semibold text-white transition hover:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-cyan-700"
					href={joinHref}
				>
					{copy.primaryAction}
				</a>
				<a
					class="rounded-md border border-neutral-300 bg-white px-5 py-4 text-center text-sm font-semibold text-neutral-950 transition hover:border-neutral-950 focus:outline-none focus:ring-2 focus:ring-cyan-700"
					href={role === 'host' ? guestHref : hostHref}
				>
					{copy.secondaryAction}
				</a>
			</div>
		</section>

		<section class="rounded-md border border-neutral-300 bg-white p-4 shadow-sm">
			<div class="grid gap-3 md:grid-cols-3">
				<div class="rounded bg-neutral-100 p-4">
					<p class="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">Step 1</p>
					<p class="mt-3 font-semibold">Open URL</p>
					<p class="mt-2 text-sm leading-6 text-neutral-600">Host Room URL or Guest Invite URL.</p>
				</div>
				<div class="rounded bg-neutral-100 p-4">
					<p class="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">Step 2</p>
					<p class="mt-3 font-semibold">Join Check</p>
					<p class="mt-2 text-sm leading-6 text-neutral-600">
						Display Name, device preview, and initial mic/camera state.
					</p>
				</div>
				<div class="rounded bg-amber-200 p-4">
					<p class="text-xs font-semibold uppercase tracking-[0.14em] text-amber-900">Step 3</p>
					<p class="mt-3 font-semibold">Backstage</p>
					<p class="mt-2 text-sm leading-6 text-amber-950">No Audience can watch yet.</p>
				</div>
			</div>

			<div class="mt-4 rounded-md bg-neutral-950 p-5 text-white">
				<div class="flex items-center justify-between">
					<p class="font-semibold">Room capacity</p>
					<p class="text-sm text-cyan-200">1 Host + 3 Guests</p>
				</div>
				<p class="mt-4 text-sm text-neutral-400">Room ID: {roomId}</p>
			</div>
		</section>
	</div>
</main>
