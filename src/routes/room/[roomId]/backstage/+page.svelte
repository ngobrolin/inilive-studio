<script lang="ts">
	import RoomPresencePanel from '$lib/room/RoomPresencePanel.svelte';

	let { data } = $props();
</script>

<svelte:head>
	<title>Backstage Room - Live Studio</title>
</svelte:head>

<RoomPresencePanel
	activeParticipantId={data.activeParticipantId}
	chatMessages={data.chatMessages}
	mediaGrant={data.mediaGrant}
	presence={data.presence}
/>
