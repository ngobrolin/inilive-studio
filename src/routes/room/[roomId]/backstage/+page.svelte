<script lang="ts">
	import RoomPresencePanel from '$lib/room/RoomPresencePanel.svelte';

	let { data } = $props();
</script>

<svelte:head>
	<title>Backstage Room - Live Studio</title>
</svelte:head>

<RoomPresencePanel presence={data} />
