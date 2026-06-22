<script lang="ts">
	import RoomPresencePanel from '$lib/room/RoomPresencePanel.svelte';

	let { data, form } = $props();
</script>

<svelte:head>
	<title>Backstage Room - Live Studio</title>
</svelte:head>

<RoomPresencePanel
	activeParticipantId={data.activeParticipantId}
	actionError={form?.error ?? null}
	broadcast={data.broadcast}
	chatMessages={data.chatMessages}
	guestInvitePath={data.guestInvitePath}
	hasLinkedYouTubeChannel={data.hasLinkedYouTubeChannel}
	hostWhipIngestGrant={data.hostWhipIngestGrant}
	isProductRoom={data.isProductRoom}
	mediaGrant={data.mediaGrant}
	presence={data.presence}
/>
