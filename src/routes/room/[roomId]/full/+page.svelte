<script lang="ts">
	import RoomFullPanel from '$lib/room/RoomFullPanel.svelte';

	let { data } = $props();
</script>

<svelte:head>
	<title>Room Full - iniLive Studio</title>
</svelte:head>

<RoomFullPanel roomId={data.roomId} />
