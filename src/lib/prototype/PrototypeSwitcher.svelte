<script lang="ts">
	import { goto } from '$app/navigation';
	import { dev, browser } from '$app/environment';
	import { page } from '$app/state';
	import { onMount } from 'svelte';

	type VariantOption = {
		key: string;
		name: string;
	};

	let { variants, currentKey }: { variants: VariantOption[]; currentKey: string } = $props();

	let currentIndex = $derived(
		Math.max(
			0,
			variants.findIndex((variant) => variant.key === currentKey),
		),
	);
	let currentVariant = $derived(variants[currentIndex] ?? variants[0]);

	async function cycleVariant(direction: -1 | 1) {
		if (!browser || variants.length === 0) return;

		const nextIndex = (currentIndex + direction + variants.length) % variants.length;
		const nextVariant = variants[nextIndex];
		const url = new URL(page.url);
		url.searchParams.set('variant', nextVariant.key);

		await goto(`${url.pathname}${url.search}${url.hash}`, {
			replaceState: true,
			noScroll: true,
			keepFocus: true,
		});
	}

	function targetAcceptsArrowKeys(target: EventTarget | null) {
		if (!(target instanceof HTMLElement)) return false;

		const tagName = target.tagName.toLowerCase();
		return tagName === 'input' || tagName === 'textarea' || target.isContentEditable;
	}

	onMount(() => {
		function handleKeydown(event: KeyboardEvent) {
			if (targetAcceptsArrowKeys(event.target)) return;

			if (event.key === 'ArrowLeft') {
				event.preventDefault();
				void cycleVariant(-1);
			}

			if (event.key === 'ArrowRight') {
				event.preventDefault();
				void cycleVariant(1);
			}
		}

		window.addEventListener('keydown', handleKeydown);

		return () => {
			window.removeEventListener('keydown', handleKeydown);
		};
	});
</script>

{#if dev}
	<nav
		class="fixed bottom-5 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-full border border-white/15 bg-neutral-950/95 px-3 py-2 text-sm text-white shadow-2xl shadow-black/30 backdrop-blur"
		aria-label="Prototype variant switcher"
	>
		<button
			type="button"
			class="grid size-9 place-items-center rounded-full border border-white/10 bg-white/10 font-semibold transition hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-cyan-300"
			aria-label="Previous prototype variant"
			onclick={() => void cycleVariant(-1)}
		>
			&lt;
		</button>
		<p class="min-w-44 text-center font-medium">
			{currentVariant.key} - {currentVariant.name}
		</p>
		<button
			type="button"
			class="grid size-9 place-items-center rounded-full border border-white/10 bg-white/10 font-semibold transition hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-cyan-300"
			aria-label="Next prototype variant"
			onclick={() => void cycleVariant(1)}
		>
			&gt;
		</button>
	</nav>
{/if}
