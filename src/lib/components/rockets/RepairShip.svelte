<script lang="ts">
	interface Props {
		/** 'approaching' | 'docked' | 'departing' | 'gone' */
		phase: 'approaching' | 'docked' | 'departing' | 'gone';
		/** 0-1 progress within current phase */
		progress: number;
		/** X position of the stalled rocket */
		targetX: number;
		/** Y center of the lane */
		targetY: number;
	}

	let { phase, progress, targetX, targetY }: Props = $props();

	// Approach: fly in from upper-right
	const approachStartX = $derived(targetX + 200);
	const approachStartY = $derived(targetY - 50);

	// Depart: accelerate upward and to the right
	const departEndX = $derived(targetX + 250);
	const departEndY = $derived(targetY - 80);

	function easeOutCubic(t: number): number {
		return 1 - Math.pow(1 - t, 3);
	}

	function easeInQuad(t: number): number {
		return t * t;
	}

	const dockedX = $derived(targetX + 10);
	const dockedY = $derived(targetY);

	const currentX = $derived(
		phase === 'approaching'
			? approachStartX + (dockedX - approachStartX) * easeOutCubic(progress)
			: phase === 'departing'
				? dockedX + (departEndX - dockedX) * easeInQuad(progress)
				: dockedX
	);

	const currentY = $derived(
		phase === 'approaching'
			? approachStartY + (dockedY - approachStartY) * easeOutCubic(progress)
			: phase === 'departing'
				? dockedY + (departEndY - dockedY) * easeInQuad(progress)
				: dockedY
	);

	const shipOpacity = $derived(
		phase === 'departing' ? Math.max(0, 1 - progress * 1.3) : 1
	);

	// Departure rotation: start level, tilt upward as it accelerates away
	const departRotation = $derived(
		phase === 'departing' ? -25 * easeInQuad(progress) : 0
	);

	const visible = $derived(phase !== 'gone');
</script>

{#if visible}
	<div
		class="absolute z-30 pointer-events-none"
		style="left: {currentX}px; top: {currentY}px; transform: translate(-50%, -50%); opacity: {shipOpacity};"
	>
		<!-- Medic rescue shuttle SVG -->
		<svg viewBox="0 0 44 22" width="40" height="20"
			style="transform: {phase === 'departing' ? `scaleX(-1) rotate(${departRotation}deg)` : 'none'};"
		>
			<defs>
				<linearGradient id="medic-hull" x1="0" y1="0" x2="0" y2="1">
					<stop offset="0%" stop-color="#f0f0f0" stop-opacity="0.95" />
					<stop offset="50%" stop-color="#d4d4d4" stop-opacity="0.85" />
					<stop offset="100%" stop-color="#b0b0b0" stop-opacity="0.75" />
				</linearGradient>
				<linearGradient id="medic-stripe" x1="0" y1="0" x2="0" y2="1">
					<stop offset="0%" stop-color="#e63946" stop-opacity="0.9" />
					<stop offset="100%" stop-color="#c1121f" stop-opacity="0.8" />
				</linearGradient>
			</defs>

			<!-- Soft exhaust -->
			<ellipse cx="3" cy="11" rx="3" ry="2" fill="#88ccff" opacity="0.4">
				<animate attributeName="rx" values="2;4;2" dur="0.25s" repeatCount="indefinite" />
			</ellipse>

			<!-- Bottom fin -->
			<path d="M8,15 L5,19 L14,15 Z" fill="#c1121f" opacity="0.5" />
			<!-- Top fin -->
			<path d="M8,7 L5,3 L14,7 Z" fill="#c1121f" opacity="0.5" />

			<!-- Main hull — rounded medic shuttle -->
			<rect x="7" y="6" width="24" height="10" rx="3" fill="url(#medic-hull)" stroke="#999" stroke-width="0.4" stroke-opacity="0.5" />

			<!-- Red racing stripe along hull -->
			<rect x="7" y="9.5" width="24" height="3" rx="0.5" fill="url(#medic-stripe)" opacity="0.7" />

			<!-- Red cross — medic symbol -->
			<rect x="14.5" y="7.5" width="2" height="7" rx="0.3" fill="#e63946" opacity="0.9" />
			<rect x="12" y="9.5" width="7" height="3" rx="0.3" fill="#e63946" opacity="0.9" />
			<!-- Cross white inner highlight -->
			<rect x="15" y="8" width="1" height="6" rx="0.2" fill="white" opacity="0.3" />
			<rect x="12.5" y="10" width="6" height="2" rx="0.2" fill="white" opacity="0.3" />

			<!-- Cabin window -->
			<rect x="24" y="7.5" width="4.5" height="7" rx="1.5" fill="#0a0e1a" stroke="#ccc" stroke-width="0.4" opacity="0.85" />
			<!-- Window reflection -->
			<rect x="24.8" y="8.2" width="1.5" height="3" rx="0.5" fill="#88ccff" opacity="0.2" />

			<!-- Front nose -->
			<path d="M31,6 L36,9 Q37.5,11 36,13 L31,16" fill="#d4d4d4" stroke="#999" stroke-width="0.3" opacity="0.8" />

			<!-- Emergency beacon light — top -->
			<circle cx="20" cy="5.5" r="1.2" fill="#e63946" opacity="0.9">
				<animate attributeName="opacity" values="0.9;0.3;0.9" dur="0.8s" repeatCount="indefinite" />
			</circle>
			<circle cx="20" cy="5.5" r="2.5" fill="#e63946" opacity="0.15">
				<animate attributeName="r" values="2;3.5;2" dur="0.8s" repeatCount="indefinite" />
				<animate attributeName="opacity" values="0.2;0.05;0.2" dur="0.8s" repeatCount="indefinite" />
			</circle>

			<!-- Hull highlight -->
			<path d="M9,7.5 L27,7.5 Q30,7.5 30,8 L30,8.5 Q30,8.5 27,8.5 L9,8.5 Z" fill="white" opacity="0.15" />
		</svg>

		<!-- Label -->
		<div
			class="absolute -top-5 left-1/2 -translate-x-1/2 whitespace-nowrap font-mono text-[9px] px-1.5 py-0.5 rounded transition-opacity duration-300"
			style="background: #e6394625; color: #e63946; opacity: {phase === 'departing' ? 0 : 1};"
		>
			{phase === 'docked' ? '✚ Repairing...' : '✚ Manual Support'}
		</div>
	</div>
{/if}
