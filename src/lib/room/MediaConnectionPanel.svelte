<script lang="ts">
	import LiveKitMediaSession from '$lib/room/LiveKitMediaSession.svelte';
	import type { MediaJoinGrant } from '$lib/server/media-join';

	let {
		grant,
		cameraEnabled = true,
		microphoneEnabled = true,
		screenShareActive = false,
		canScreenShare = false,
	}: {
		grant: MediaJoinGrant | null;
		cameraEnabled?: boolean;
		microphoneEnabled?: boolean;
		screenShareActive?: boolean;
		canScreenShare?: boolean;
	} = $props();
</script>

{#if grant}
	<LiveKitMediaSession {cameraEnabled} {canScreenShare} {grant} {microphoneEnabled} {screenShareActive} />
{/if}
