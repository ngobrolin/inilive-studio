<script lang="ts">
	let email = $state("");
	let submitted = $state(false);
	let errorMessage = $state<string | null>(null);

	async function submit(event: SubmitEvent) {
		event.preventDefault();
		errorMessage = null;

		const response = await fetch("/auth/login", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ email }),
		});

		if (!response.ok) {
			errorMessage = "Could not request a magic link right now.";
			return;
		}

		submitted = true;
	}
</script>

<main class="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-6 py-12">
	<h1 class="text-3xl font-semibold">Host sign in</h1>
	<p class="mt-2 text-sm text-slate-600">
		Enter your email and we will send a one-time magic link. Guests still join through Guest
		Invites without an Account.
	</p>

	{#if submitted}
		<p class="mt-6 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
			If that email can sign in, a magic link is on the way.
		</p>
	{:else}
		<form class="mt-6 space-y-4" onsubmit={submit}>
			<label class="block text-sm font-medium text-slate-700">
				Email
				<input
					class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
					type="email"
					name="email"
					bind:value={email}
					required
					autocomplete="email"
				/>
			</label>

			{#if errorMessage}
				<p class="text-sm text-red-700">{errorMessage}</p>
			{/if}

			<button
				class="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white"
				type="submit"
			>
				Send magic link
			</button>
		</form>
	{/if}
</main>
