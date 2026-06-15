<script lang="ts">
	import RoomEntryPanel from '$lib/room/RoomEntryPanel.svelte';
	import { guestInvitePath, hostRoomPath } from '$lib/room/entry-copy';

	let { data } = $props();
</script>

<svelte:head>
	<title>Host Room - Live Studio</title>
</svelte:head>

<RoomEntryPanel
	role="host"
	roomId={data.roomId}
	hostHref={hostRoomPath(data.roomId)}
	guestHref={guestInvitePath(data.roomId)}
/>
