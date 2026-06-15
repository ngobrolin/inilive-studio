<script lang="ts">
	import RoomEntryPanel from '$lib/room/RoomEntryPanel.svelte';
	import { guestInvitePath, guestJoinPath, hostRoomPath } from '$lib/room/entry-copy';

	let { data } = $props();
</script>

<svelte:head>
	<title>Guest Invite - Live Studio</title>
</svelte:head>

<RoomEntryPanel
	role="guest"
	roomId={data.roomId}
	hostHref={hostRoomPath(data.roomId)}
	guestHref={guestInvitePath(data.roomId, data.inviteToken)}
	joinHref={guestJoinPath(data.roomId, data.inviteToken)}
/>
