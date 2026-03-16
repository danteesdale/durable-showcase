<script lang="ts">
	const VISIBLE_HEIGHT = 50;

	let containerEl: HTMLDivElement | undefined = $state();
	let parentWidth = $state(1200);

	$effect(() => {
		if (containerEl) {
			const scene = containerEl.closest('[data-scene]') as HTMLElement;
			if (scene) {
				const obs = new ResizeObserver((entries) => {
					parentWidth = entries[0].contentRect.width;
				});
				obs.observe(scene);
				return () => obs.disconnect();
			}
		}
	});

	// Calculate planet radius so the visible chord spans ~92% of scene width
	const chord = $derived(parentWidth * 0.92);
	const radius = $derived(
		Math.round((chord * chord + 4 * VISIBLE_HEIGHT * VISIBLE_HEIGHT) / (8 * VISIBLE_HEIGHT))
	);
	const diameter = $derived(radius * 2);
</script>

<div
	bind:this={containerEl}
	class="absolute inset-x-0 bottom-0 pointer-events-none"
	style="z-index: 2;"
>
	<!-- Planet body -->
	<div
		class="absolute left-1/2 -translate-x-1/2 rounded-full overflow-hidden"
		style="
			width: {diameter}px;
			height: {diameter}px;
			bottom: -{diameter - VISIBLE_HEIGHT}px;
		"
	>
		<!-- SVG surface with procedural terrain -->
		<svg
			class="absolute top-0 left-0"
			width={diameter}
			height={VISIBLE_HEIGHT}
			xmlns="http://www.w3.org/2000/svg"
		>
			<defs>
				<!-- Procedural moon terrain via noise + 3D lighting -->
				<filter id="moon-terrain" x="0" y="0" width="100%" height="100%" color-interpolation-filters="linearRGB">
					<!-- Fractal noise for natural terrain heightmap -->
					<feTurbulence
						type="fractalNoise"
						baseFrequency="0.009 0.018"
						numOctaves="7"
						seed="42"
						result="noise"
					/>
					<!-- Diffuse lighting creates 3D rocky surface from noise -->
					<feDiffuseLighting
						in="noise"
						surfaceScale="4"
						diffuseConstant="1.0"
						lighting-color="#bbb"
						result="lit"
					>
						<feDistantLight azimuth="225" elevation="30" />
					</feDiffuseLighting>
					<!-- Soften slightly to reduce harshness -->
					<feGaussianBlur stdDeviation="0.35" result="softened" />
					<!-- Map to mid-gray tones -->
					<feColorMatrix
						type="matrix"
						values="
							0.55 0 0 0 0.1
							0.55 0 0 0 0.1
							0.57 0 0 0 0.11
							0    0 0 1 0
						"
					/>
				</filter>

				<!-- Fade: bright at horizon, into shadow below, soft at edges -->
				<linearGradient id="surface-fade-v" x1="0" y1="0" x2="0" y2="1">
					<stop offset="0%" stop-color="white" stop-opacity="0.9" />
					<stop offset="40%" stop-color="white" stop-opacity="1" />
					<stop offset="75%" stop-color="white" stop-opacity="0.8" />
					<stop offset="100%" stop-color="white" stop-opacity="0.4" />
				</linearGradient>
				<linearGradient id="surface-fade-h" x1="0" y1="0" x2="1" y2="0">
					<stop offset="0%" stop-color="white" stop-opacity="0" />
					<stop offset="8%" stop-color="white" stop-opacity="1" />
					<stop offset="92%" stop-color="white" stop-opacity="1" />
					<stop offset="100%" stop-color="white" stop-opacity="0" />
				</linearGradient>
				<mask id="surface-mask">
					<rect width="100%" height="100%" fill="url(#surface-fade-v)" />
					<rect width="100%" height="100%" fill="url(#surface-fade-h)" style="mix-blend-mode: multiply;" />
				</mask>
			</defs>

			<!-- Terrain surface -->
			<rect
				x="0" y="0"
				width="100%" height="100%"
				filter="url(#moon-terrain)"
				mask="url(#surface-mask)"
			/>

			<!-- Soft rim highlight at the horizon -->
			<line
				x1="0" y1="1"
				x2={diameter} y2="1"
				stroke="rgba(200, 205, 220, 0.12)"
				stroke-width="2"
			/>
		</svg>
	</div>
</div>
