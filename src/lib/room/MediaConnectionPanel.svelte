<script lang="ts">
	import LiveKitMediaSession from '$lib/room/LiveKitMediaSession.svelte';
	import type { MediaJoinGrant } from '$lib/server/media-join';

	let {
		grant,
		cameraEnabled = true,
		microphoneEnabled = true,
	}: {
		grant: MediaJoinGrant | null;
		cameraEnabled?: boolean;
		microphoneEnabled?: boolean;
	} = $props();
</script>

{#if grant}
	<LiveKitMediaSession {cameraEnabled} {grant} {microphoneEnabled} />
{/if}
