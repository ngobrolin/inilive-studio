<script lang="ts">
	import JoinCheckPanel from '$lib/room/JoinCheckPanel.svelte';

	let { data } = $props();
</script>

<svelte:head>
	<title>Join Check - Guest Invite - Live Studio</title>
</svelte:head>

<JoinCheckPanel formAction="" role="guest" roomId={data.roomId} />
