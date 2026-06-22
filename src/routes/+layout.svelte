<script lang="ts">
	import { page } from '$app/state';
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import DashboardNavLink from '$lib/navigation/DashboardNavLink.svelte';

	let { children } = $props();

	const showDashboardLink = $derived(page.url.pathname !== '/dashboard');
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>

{#if showDashboardLink}
	<nav
		aria-label="App navigation"
		class="border-b border-neutral-200 bg-white px-5 py-2.5"
	>
		<div class="mx-auto flex max-w-6xl justify-end">
			<DashboardNavLink />
		</div>
	</nav>
{/if}

{@render children()}
