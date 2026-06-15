<script lang="ts">
	import { page } from '$app/state';
	import PrototypeSwitcher from '$lib/prototype/PrototypeSwitcher.svelte';

	type Role = 'host' | 'guest';
	type VariantKey = 'A' | 'B' | 'C';

	const variants = [
		{ key: 'A', name: 'Control desk' },
		{ key: 'B', name: 'Join console' },
		{ key: 'C', name: 'Preview first' },
	];

	const roomId = 'demo-room';
	const guestSlots = ['Guest slot 1', 'Guest slot 2', 'Guest slot 3'];

	let activeRole: Role = $derived.by(() => {
		return page.url.searchParams.get('role') === 'guest' ? 'guest' : 'host';
	});

	let currentVariant: VariantKey = $derived.by(() => {
		const variant = page.url.searchParams.get('variant')?.toUpperCase();
		return variant === 'B' || variant === 'C' ? variant : 'A';
	});

	let roleCopy = $derived.by(() => {
		if (activeRole === 'host') {
			return {
				eyebrow: 'Host Room URL',
				title: 'Prepare the Room before anything is Broadcasting',
				body: 'Open an authless Host view, copy the Guest Invite, and keep the Room in Backstage while setup is still local and ephemeral.',
				primaryAction: 'Enter as Host',
				secondaryAction: 'Copy Guest Invite',
			};
		}

		return {
			eyebrow: 'Guest Invite URL',
			title: 'Join the Room without creating an Account',
			body: 'Guests arrive through the invite link, confirm their Display Name later, and wait in Backstage without touching Host controls.',
			primaryAction: 'Enter as Guest',
			secondaryAction: 'View Host Room URL',
		};
	});

	let prototypeState = $derived.by(() => ({
		prototype: true,
		route: '/prototype/room-entry',
		roomId,
		role: activeRole,
		variant: currentVariant,
		guestInvite: buildUrl({ role: 'guest' }),
		broadcastState: 'Backstage',
		broadcasting: false,
		auth: 'none',
		persistence: 'none',
		participantLimit: '1 Host + 3 Guests',
	}));

	function buildUrl(updates: Record<string, string>) {
		const url = new URL(page.url);
		for (const [key, value] of Object.entries(updates)) {
			url.searchParams.set(key, value);
		}
		if (!url.searchParams.has('variant')) url.searchParams.set('variant', currentVariant);
		return `${url.pathname}${url.search}`;
	}

	function roleUrl(role: Role) {
		return buildUrl({ role });
	}
</script>

<svelte:head>
	<title>Room Entry Prototype - Live Studio</title>
</svelte:head>

<main class="min-h-screen bg-[#f5f3ee] text-neutral-950">
	{#if currentVariant === 'A'}
		<section class="grid min-h-screen grid-cols-1 lg:grid-cols-[380px_minmax(0,1fr)]">
			<aside class="flex flex-col justify-between border-r border-neutral-200 bg-[#101413] p-6 text-white">
				<div>
					<p class="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-200">
						PROTOTYPE - throwaway route
					</p>
					<h1 class="mt-5 text-4xl font-semibold leading-tight">Live Studio Room Entry</h1>
					<p class="mt-4 text-sm leading-6 text-neutral-300">
						Three variants for the first authless Host and Guest entry path. Nothing here
						is persisted, authenticated, or Broadcasting.
					</p>
				</div>

				<div class="mt-8 space-y-3">
					<a
						class="block rounded-md border border-cyan-300/40 bg-cyan-300 px-4 py-3 text-sm font-semibold text-neutral-950 transition hover:bg-cyan-200 focus:outline-none focus:ring-2 focus:ring-cyan-200"
						href={roleUrl('host')}
						aria-current={activeRole === 'host' ? 'page' : undefined}
					>
						Host Room URL
					</a>
					<a
						class="block rounded-md border border-white/15 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-cyan-200"
						href={roleUrl('guest')}
						aria-current={activeRole === 'guest' ? 'page' : undefined}
					>
						Guest Invite URL
					</a>
				</div>
			</aside>

			<div class="grid gap-8 p-5 lg:grid-cols-[minmax(0,1fr)_340px] lg:p-8">
				<section class="mb-20 flex min-h-[620px] flex-col rounded-md bg-neutral-950 p-5 text-white shadow-xl">
					<header class="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
						<div>
							<p class="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-200">
								{roleCopy.eyebrow}
							</p>
							<h2 class="mt-2 text-2xl font-semibold">{roleCopy.title}</h2>
						</div>
						<span class="rounded-full bg-amber-300 px-3 py-1 text-xs font-semibold text-neutral-950">
							Backstage
						</span>
					</header>

					<div class="grid flex-1 content-center gap-4 py-8 md:grid-cols-2">
						<div class="rounded-md border border-cyan-300/30 bg-cyan-300/10 p-5">
							<p class="text-sm font-semibold text-cyan-100">Host</p>
							<div class="mt-10 aspect-video rounded-md bg-gradient-to-br from-cyan-300 to-neutral-700 p-4">
								<div class="flex h-full items-end justify-between">
									<span class="rounded bg-neutral-950/80 px-2 py-1 text-xs">Riza - Host</span>
									<span class="rounded bg-neutral-950/80 px-2 py-1 text-xs">Mic on</span>
								</div>
							</div>
						</div>
						{#each guestSlots as slot}
							<div class="rounded-md border border-white/10 bg-white/[0.04] p-5">
								<p class="text-sm font-semibold text-neutral-300">{slot}</p>
								<div class="mt-10 grid aspect-video place-items-center rounded-md border border-dashed border-white/20 text-sm text-neutral-400">
									Waiting for Guest
								</div>
							</div>
						{/each}
					</div>

					<footer class="flex flex-wrap gap-3 border-t border-white/10 pt-4">
						<a class="rounded-md bg-white px-4 py-3 text-sm font-semibold text-neutral-950" href={roleUrl(activeRole)}>
							{roleCopy.primaryAction}
						</a>
						<a class="rounded-md border border-white/15 px-4 py-3 text-sm font-semibold" href={roleUrl(activeRole === 'host' ? 'guest' : 'host')}>
							{roleCopy.secondaryAction}
						</a>
					</footer>
				</section>

				{@render prototypeStatePanel(prototypeState)}
			</div>
		</section>
	{:else if currentVariant === 'B'}
		<section class="mx-auto flex min-h-screen max-w-6xl flex-col px-5 py-8">
			<header class="flex flex-wrap items-center justify-between gap-4 border-b border-neutral-300 pb-5">
				<div>
					<p class="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">
						PROTOTYPE - Room starts Backstage
					</p>
					<h1 class="mt-2 text-4xl font-semibold">Choose a Room entry path</h1>
				</div>
				<nav class="flex rounded-md border border-neutral-300 bg-white p-1" aria-label="Room role">
					<a class="rounded px-4 py-2 text-sm font-semibold data-[active=true]:bg-neutral-950 data-[active=true]:text-white" data-active={activeRole === 'host'} href={roleUrl('host')}>
						Host
					</a>
					<a class="rounded px-4 py-2 text-sm font-semibold data-[active=true]:bg-neutral-950 data-[active=true]:text-white" data-active={activeRole === 'guest'} href={roleUrl('guest')}>
						Guest
					</a>
				</nav>
			</header>

			<div class="grid flex-1 items-center gap-8 py-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
				<section class="space-y-6">
					<div>
						<p class="text-sm font-semibold uppercase tracking-[0.14em] text-cyan-700">
							{roleCopy.eyebrow}
						</p>
						<h2 class="mt-3 text-5xl font-semibold leading-none">{roleCopy.title}</h2>
						<p class="mt-5 max-w-xl text-lg leading-8 text-neutral-700">{roleCopy.body}</p>
					</div>

					<div class="grid gap-3 sm:grid-cols-2">
						<a class="rounded-md bg-neutral-950 px-5 py-4 text-center text-sm font-semibold text-white transition hover:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-cyan-700" href={roleUrl(activeRole)}>
							{roleCopy.primaryAction}
						</a>
						<a class="rounded-md border border-neutral-300 bg-white px-5 py-4 text-center text-sm font-semibold text-neutral-950 transition hover:border-neutral-950 focus:outline-none focus:ring-2 focus:ring-cyan-700" href={roleUrl(activeRole === 'host' ? 'guest' : 'host')}>
							{roleCopy.secondaryAction}
						</a>
					</div>
				</section>

				<section class="rounded-md border border-neutral-300 bg-white p-4 shadow-sm">
					<div class="grid gap-3 md:grid-cols-3">
						<div class="rounded bg-neutral-100 p-4">
							<p class="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">Step 1</p>
							<p class="mt-3 font-semibold">Open URL</p>
							<p class="mt-2 text-sm leading-6 text-neutral-600">Host Room URL or Guest Invite URL.</p>
						</div>
						<div class="rounded bg-neutral-100 p-4">
							<p class="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">Step 2</p>
							<p class="mt-3 font-semibold">Join Check</p>
							<p class="mt-2 text-sm leading-6 text-neutral-600">Display Name and local media preview later.</p>
						</div>
						<div class="rounded bg-amber-200 p-4">
							<p class="text-xs font-semibold uppercase tracking-[0.14em] text-amber-900">Step 3</p>
							<p class="mt-3 font-semibold">Backstage</p>
							<p class="mt-2 text-sm leading-6 text-amber-950">No Audience can watch yet.</p>
						</div>
					</div>

					<div class="mt-4 rounded-md bg-neutral-950 p-5 text-white">
						<div class="flex items-center justify-between">
							<p class="font-semibold">Room capacity</p>
							<p class="text-sm text-cyan-200">1 Host + 3 Guests</p>
						</div>
						<div class="mt-5 grid grid-cols-4 gap-2">
							<div class="h-24 rounded bg-cyan-300 p-2 text-xs font-semibold text-neutral-950">Host</div>
							{#each guestSlots as slot}
								<div class="grid h-24 place-items-center rounded border border-dashed border-white/25 text-center text-xs text-neutral-400">
									{slot}
								</div>
							{/each}
						</div>
					</div>
				</section>
			</div>

			{@render prototypeStatePanel(prototypeState, true)}
		</section>
	{:else}
		<section class="grid min-h-screen grid-rows-[auto_minmax(0,1fr)] bg-[#dfe7e4]">
			<header class="flex flex-wrap items-center justify-between gap-4 px-5 py-4 lg:px-8">
				<div>
					<p class="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-600">
						PROTOTYPE - Preview-first entry
					</p>
					<h1 class="mt-1 text-2xl font-semibold">Live Studio</h1>
				</div>
				<div class="flex rounded-md bg-white p-1 shadow-sm">
					<a class="rounded px-4 py-2 text-sm font-semibold data-[active=true]:bg-neutral-950 data-[active=true]:text-white" data-active={activeRole === 'host'} href={roleUrl('host')}>
						Host
					</a>
					<a class="rounded px-4 py-2 text-sm font-semibold data-[active=true]:bg-neutral-950 data-[active=true]:text-white" data-active={activeRole === 'guest'} href={roleUrl('guest')}>
						Guest
					</a>
				</div>
			</header>

			<div class="grid gap-5 px-5 pb-24 lg:grid-cols-[minmax(0,1fr)_360px] lg:px-8">
				<section class="flex min-h-[520px] flex-col justify-between rounded-md bg-neutral-950 p-4 text-white shadow-xl">
					<div class="flex items-center justify-between">
						<span class="rounded-full bg-amber-300 px-3 py-1 text-xs font-semibold text-neutral-950">
							Broadcast State: Backstage
						</span>
						<span class="text-sm text-neutral-400">Composed Room Feed preview</span>
					</div>

					<div class="mx-auto grid w-full max-w-5xl flex-1 place-items-center py-6">
						<div class="aspect-video w-full rounded-md border border-white/10 bg-neutral-900 p-4">
							<div class="grid h-full grid-cols-2 grid-rows-2 gap-3">
								<div class="relative rounded bg-cyan-300">
									<span class="absolute bottom-3 left-3 rounded bg-neutral-950/80 px-2 py-1 text-sm font-semibold">
										Host
									</span>
								</div>
								{#each guestSlots as slot}
									<div class="grid rounded border border-dashed border-white/20 bg-white/[0.03] place-items-center text-sm text-neutral-400">
										{slot}
									</div>
								{/each}
							</div>
						</div>
					</div>

					<p class="border-t border-white/10 pt-4 text-sm leading-6 text-neutral-300">
						This preview-first shape makes the Composed Room Feed the orientation point
						before Join Check and real media exist.
					</p>
				</section>

				<aside class="mt-32 flex flex-col gap-4 lg:mt-0">
					<section class="rounded-md bg-white p-5 shadow-sm">
						<p class="text-xs font-semibold uppercase tracking-[0.14em] text-cyan-700">
							{roleCopy.eyebrow}
						</p>
						<h2 class="mt-3 text-3xl font-semibold leading-tight">{roleCopy.title}</h2>
						<p class="mt-4 text-sm leading-6 text-neutral-700">{roleCopy.body}</p>
						<div class="mt-6 grid gap-3">
							<a class="rounded-md bg-neutral-950 px-4 py-3 text-center text-sm font-semibold text-white" href={roleUrl(activeRole)}>
								{roleCopy.primaryAction}
							</a>
							<a class="rounded-md border border-neutral-300 px-4 py-3 text-center text-sm font-semibold" href={roleUrl(activeRole === 'host' ? 'guest' : 'host')}>
								{roleCopy.secondaryAction}
							</a>
						</div>
					</section>
					{@render prototypeStatePanel(prototypeState)}
				</aside>
			</div>
		</section>
	{/if}

	<PrototypeSwitcher {variants} currentKey={currentVariant} />
</main>

{#snippet prototypeStatePanel(state: Record<string, unknown>, wide = false)}
	<section
		class={wide
			? 'rounded-md border border-neutral-300 bg-white p-5 pb-24 text-neutral-950 shadow-sm'
			: 'rounded-md border border-neutral-300 bg-white p-5 text-neutral-950 shadow-sm'}
	>
		<div class="flex items-center justify-between gap-3">
			<h2 class="text-sm font-semibold uppercase tracking-[0.14em] text-neutral-500">
				Prototype state
			</h2>
			<span class="rounded-full bg-neutral-100 px-3 py-1 text-xs font-semibold">
				No persistence
			</span>
		</div>
		<dl class={wide ? 'mt-5 grid gap-3 text-sm md:grid-cols-2 xl:grid-cols-5' : 'mt-5 grid gap-3 text-sm'}>
			{#each Object.entries(state) as [key, value]}
				<div class="grid gap-1 border-b border-neutral-100 pb-3 last:border-b-0 last:pb-0">
					<dt class="font-semibold text-neutral-500">{key}</dt>
					<dd class="break-words font-mono text-neutral-950">{String(value)}</dd>
				</div>
			{/each}
		</dl>
	</section>
{/snippet}
