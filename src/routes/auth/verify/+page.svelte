<script lang="ts">
	import { goto } from "$app/navigation";
	import { onMount } from "svelte";

	let status = $state<"pending" | "success" | "error">("pending");
	let message = $state("Completing sign-in...");

	onMount(async () => {
		const token = window.location.hash.replace(/^#/, "").trim();
		if (!token) {
			status = "error";
			message = "This sign-in link is missing its token.";
			return;
		}

		const response = await fetch("/auth/exchange", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ token }),
		});

		if (!response.ok) {
			status = "error";
			message = "This sign-in link is invalid or has expired.";
			return;
		}

		status = "success";
		message = "Signed in. Redirecting to your Host dashboard...";
		await goto("/dashboard");
	});
</script>

<main class="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-6 py-12">
	<h1 class="text-3xl font-semibold">Host sign in</h1>
	<p
		class="mt-4 rounded-lg border px-4 py-3 text-sm"
		class:border-emerald-200={status === "success"}
		class:bg-emerald-50={status === "success"}
		class:text-emerald-900={status === "success"}
		class:border-red-200={status === "error"}
		class:bg-red-50={status === "error"}
		class:text-red-900={status === "error"}
		class:border-slate-200={status === "pending"}
		class:bg-slate-50={status === "pending"}
		class:text-slate-700={status === "pending"}
	>
		{message}
	</p>
</main>
