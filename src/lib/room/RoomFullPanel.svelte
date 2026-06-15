<script lang="ts">
	let { roomId }: { roomId: string } = $props();
</script>

<main class="mx-auto flex min-h-screen max-w-2xl flex-col justify-center px-5 py-8 text-neutral-950">
	<p class="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">Room {roomId}</p>
	<h1 class="mt-3 text-5xl font-semibold">Room Full</h1>
	<p class="mt-5 text-lg leading-8 text-neutral-700">
		This prototype Room already has three Guests. Ask the Host to make space before joining.
	</p>
	<p class="mt-6 rounded-md bg-amber-100 px-4 py-3 text-sm font-semibold text-amber-950">
		Backstage is still private. Nothing is Broadcasting.
	</p>
</main>
