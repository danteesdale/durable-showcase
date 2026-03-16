<script lang="ts">
	import '../app.css';

	let { children } = $props();
</script>

<svelte:head>
	<title>Durable Showcase — Why Durable Execution Matters</title>
	<meta name="description" content="Four rockets race through 250 service calls. Only one survives every failure. An interactive demo showing why durable execution matters." />

	<!-- Open Graph -->
	<meta property="og:type" content="website" />
	<meta property="og:title" content="Durable Showcase — Why Durable Execution Matters" />
	<meta property="og:description" content="Four rockets race through 250 service calls with injectable failures. Watch Standard Retries explode, Event-Driven stall, and Temporal pause and resume — every time." />
	<meta property="og:image" content="/og-image.png" />
	<meta property="og:image:width" content="1200" />
	<meta property="og:image:height" content="630" />

	<!-- Twitter Card -->
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content="Durable Showcase — Why Durable Execution Matters" />
	<meta name="twitter:description" content="Four rockets race through 250 service calls with injectable failures. An interactive demo of Temporal's durable execution." />
	<meta name="twitter:image" content="/og-image.png" />

	<!-- Theme -->
	<meta name="theme-color" content="#0a0e1a" />
</svelte:head>

{@render children()}
