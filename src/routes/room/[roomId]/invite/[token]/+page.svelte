<script lang="ts">
	import RoomEntryPanel from '$lib/room/RoomEntryPanel.svelte';
	import { guestInvitePath, guestJoinPath, hostRoomPath } from '$lib/room/entry-copy';

	let { data } = $props();
</script>

<svelte:head>
	<title>Guest Invite - Live Studio</title>
</svelte:head>

{#if data.inviteStatus === 'invalid'}
	<main class="mx-auto flex min-h-screen max-w-2xl flex-col justify-center px-6 py-12">
		<p class="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Guest Invite</p>
		<h1 class="mt-3 text-4xl font-semibold">Guest Invite unavailable</h1>
		<p class="mt-4 text-slate-600">
			This Guest Invite is no longer valid. Ask the Host for the current Guest Invite link.
		</p>
	</main>
{:else}
	<RoomEntryPanel
		role="guest"
		roomId={data.roomId}
		hostHref={hostRoomPath(data.roomId)}
		guestHref={guestInvitePath(data.roomId, data.inviteToken)}
		joinHref={guestJoinPath(data.roomId, data.inviteToken)}
	/>
{/if}
