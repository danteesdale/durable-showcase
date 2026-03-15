<script lang="ts">
	import '../app.css';

	let { children } = $props();
</script>

<svelte:head>
	<title>Durable Showcase — Why Durable Execution Matters</title>
	<meta name="description" content="A visual demonstration of Temporal's durable execution through an interactive space mission simulation." />
</svelte:head>

{@render children()}
