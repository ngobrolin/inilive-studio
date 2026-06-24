<script lang="ts">
	import RoomEntryPanel from '$lib/room/RoomEntryPanel.svelte';
	import { hostJoinPath, hostRoomPath } from '$lib/room/entry-copy';

	let { data } = $props();
</script>

<svelte:head>
	<title>Host Room - iniLive Studio</title>
</svelte:head>

<RoomEntryPanel
	role="host"
	roomId={data.roomId}
	hostHref={hostRoomPath(data.roomId)}
	guestHref={data.guestInvitePath ?? hostRoomPath(data.roomId)}
	joinHref={hostJoinPath(data.roomId)}
/>
