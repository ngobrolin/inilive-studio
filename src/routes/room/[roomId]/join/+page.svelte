<script lang="ts">
	import JoinCheckPanel from '$lib/room/JoinCheckPanel.svelte';

	let { data } = $props();
</script>

<svelte:head>
	<title>Join Check - Host Room - iniLive Studio</title>
</svelte:head>

<JoinCheckPanel formAction="" role="host" roomId={data.roomId} />
