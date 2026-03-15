<script lang="ts">
	interface Props {
		size?: number;
		x?: string;
		y?: string;
		color1?: string;
		color2?: string;
		ringColor?: string;
		hasRing?: boolean;
	}

	let {
		size = 60,
		x = '80%',
		y = '15%',
		color1 = '#2d3561',
		color2 = '#1a1f3a',
		ringColor = 'rgba(200, 200, 255, 0.15)',
		hasRing = false
	}: Props = $props();
</script>

<div
	class="absolute pointer-events-none"
	style="left: {x}; top: {y}; width: {size}px; height: {size}px;"
>
	<svg viewBox="0 0 100 100" width={size} height={size}>
		<defs>
			<radialGradient id="planet-{x}-{y}" cx="35%" cy="35%">
				<stop offset="0%" stop-color={color1} />
				<stop offset="100%" stop-color={color2} />
			</radialGradient>
			<radialGradient id="atmosphere-{x}-{y}" cx="50%" cy="50%">
				<stop offset="85%" stop-color="transparent" />
				<stop offset="100%" stop-color="{color1}40" />
			</radialGradient>
		</defs>

		<!-- Planet body -->
		<circle cx="50" cy="50" r="40" fill="url(#planet-{x}-{y})" />

		<!-- Atmosphere glow -->
		<circle cx="50" cy="50" r="43" fill="url(#atmosphere-{x}-{y})" />

		<!-- Ring (optional) -->
		{#if hasRing}
			<ellipse
				cx="50"
				cy="50"
				rx="58"
				ry="12"
				fill="none"
				stroke={ringColor}
				stroke-width="3"
				transform="rotate(-15, 50, 50)"
			/>
		{/if}
	</svg>
</div>
