<script lang="ts">
	import Starfield from './Starfield.svelte';
	import Nebula from './Nebula.svelte';
	import Planet from './Planet.svelte';
	import RocketLane from '../rockets/RocketLane.svelte';
	import type { RocketSimulation } from '$lib/simulation/types';

	interface Props {
		rockets: RocketSimulation[];
	}

	let { rockets }: Props = $props();
</script>

<div class="relative w-full flex-1 overflow-hidden">
	<!-- Background layers -->
	<Starfield />
	<Nebula />

	<!-- Decorative planets -->
	<Planet size={50} x="85%" y="8%" color1="#2d3561" color2="#1a1f3a" />
	<Planet size={35} x="8%" y="65%" color1="#4a2545" color2="#2d1530" hasRing />
	<Planet size={25} x="70%" y="75%" color1="#1d3a2d" color2="#0f2018" />

	<!-- Rocket lanes -->
	<div class="absolute inset-0 flex flex-col justify-center px-6 gap-1 z-10">
		{#each rockets as rocket (rocket.id)}
			<RocketLane {rocket} />
		{/each}
	</div>
</div>
