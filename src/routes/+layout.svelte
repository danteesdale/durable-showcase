<script lang="ts">
	import '../app.css';

	let { children } = $props();
</script>

<svelte:head>
	<title>Durable Showcase — Why Durable Execution Matters</title>
	<meta name="description" content="Four rockets race through 250 service calls. Only one survives every failure. An interactive demo showing why durable execution matters." />

	<meta name="theme-color" content="#0a0e1a" />
</svelte:head>

{@render children()}
