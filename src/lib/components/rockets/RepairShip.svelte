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
		<!-- Small repair/rescue shuttle SVG -->
		<svg viewBox="0 0 40 20" width="36" height="18"
			style="transform: {phase === 'departing' ? `scaleX(-1) rotate(${departRotation}deg)` : 'none'};"
		>
			<defs>
				<linearGradient id="repair-hull" x1="0" y1="0" x2="0" y2="1">
					<stop offset="0%" stop-color="#ffd60a" stop-opacity="0.9" />
					<stop offset="100%" stop-color="#f48c06" stop-opacity="0.7" />
				</linearGradient>
			</defs>

			<!-- Small exhaust -->
			<ellipse cx="3" cy="10" rx="3" ry="2" fill="#f48c06" opacity="0.5">
				<animate attributeName="rx" values="2;4;2" dur="0.2s" repeatCount="indefinite" />
			</ellipse>

			<!-- Body — small boxy shuttle -->
			<rect x="6" y="6" width="22" height="8" rx="2" fill="url(#repair-hull)" stroke="#ffd60a" stroke-width="0.4" stroke-opacity="0.5" />

			<!-- Cabin window -->
			<rect x="22" y="7.5" width="4" height="5" rx="1" fill="#0a0e1a" stroke="#ffd60a" stroke-width="0.4" opacity="0.8" />

			<!-- Repair cross symbol -->
			<line x1="13" y1="8" x2="13" y2="12" stroke="white" stroke-width="1.2" opacity="0.7" />
			<line x1="11" y1="10" x2="15" y2="10" stroke="white" stroke-width="1.2" opacity="0.7" />

			<!-- Front -->
			<path d="M28,6 L33,8.5 Q34,10 33,11.5 L28,14" fill="#ffd60a" opacity="0.6" />

			<!-- Small fin -->
			<path d="M8,6 L6,3 L12,6 Z" fill="#f48c06" opacity="0.5" />
			<path d="M8,14 L6,17 L12,14 Z" fill="#f48c06" opacity="0.5" />
		</svg>

		<!-- Label -->
		<div
			class="absolute -top-5 left-1/2 -translate-x-1/2 whitespace-nowrap font-mono text-[9px] px-1.5 py-0.5 rounded transition-opacity duration-300"
			style="background: #ffd60a25; color: #ffd60a; opacity: {phase === 'departing' ? 0 : 1};"
		>
			{phase === 'docked' ? '🔧 Repairing...' : '🔧 Manual Repair'}
		</div>
	</div>
{/if}
