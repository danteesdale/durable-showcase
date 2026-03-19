<script lang="ts">
	import type { RocketState, StrategyType } from '$lib/simulation/types';
	import { ROCKET_CONFIG } from '$lib/constants';

	interface Props {
		strategyType: StrategyType;
		state: RocketState;
		completedCalls: number;
		totalCalls: number;
	}

	let { strategyType, state, completedCalls, totalCalls }: Props = $props();

	const config = $derived(ROCKET_CONFIG[strategyType]);

	const stateLabel = $derived(() => {
		switch (state) {
			case 'idle': return 'Ready';
			case 'in-progress': return 'In Flight';
			case 'retrying': return 'Retrying...';
			case 'paused': return 'Waiting...';
			case 'failed': return 'Failed';
			case 'completed': return 'Complete';
			case 'error-queue-stalled': return 'Stalled';
			case 'repair-approaching': return 'Repair En Route';
			case 'repair-docked': return 'Repairing...';
			case 'repair-departing': return 'In Flight';
			default: return 'Unknown';
		}
	});

	const stateColor = $derived(() => {
		switch (state) {
			case 'completed': return '#06d6a0';
			case 'failed': return '#e63946';
			case 'error-queue-stalled': return '#e63946';
			case 'repair-approaching':
			case 'repair-docked': return '#ffd60a';
			case 'repair-departing': return config.color;
			case 'paused':
			case 'retrying': return '#ffd60a';
			default: return config.color;
		}
	});
</script>

<div class="flex items-center md:items-start gap-1.5 md:gap-2 min-w-0">
	<!-- Colored dot (mobile only) -->
	<span class="block md:hidden w-2 h-2 rounded-full shrink-0 mt-0.5" style="background: {config.color};"></span>

	<!-- Strategy name + state badge stacked on desktop -->
	<div class="flex flex-col gap-0.5 min-w-0">
		<!-- Strategy name with custom tooltip -->
		<span class="relative group/tooltip inline-block">
			<span
				class="font-display text-xs md:text-sm font-semibold cursor-help"
				style="color: {config.color};"
			>
				{config.label}
			</span>
			<div
				class="absolute top-full left-0 mt-2 z-50 pointer-events-none w-56
				       opacity-0 group-hover/tooltip:opacity-100 transition-opacity duration-150
				       p-3 rounded-lg border"
				style="
					background: #1a1e2e;
					border-color: {config.color}30;
					box-shadow: 0 4px 20px rgba(0,0,0,0.6), 0 0 10px {config.color}15;
				"
			>
				<p class="font-mono leading-relaxed mb-2" style="color: #94a3b8; font-size: 10px;">{config.description}</p>
				<p class="font-mono" style="color: {config.color}; font-size: 10px;">Good for: <span style="color: #64748b;">{config.goodFor}</span></p>
			</div>
		</span>

		<!-- State badge + call counter row -->
		<div class="flex items-center gap-1.5">
			<!-- State badge (hidden on mobile for compactness) -->
			<span
				class="hidden md:inline font-mono text-[10px] px-1.5 py-0.5 rounded-full whitespace-nowrap"
				style="background: {stateColor()}20; color: {stateColor()};"
			>
				{stateLabel()}
			</span>

			<!-- Call counter -->
			{#if state !== 'idle'}
				<span class="font-mono text-[10px] text-text-muted shrink-0">
					{completedCalls}/{totalCalls}
				</span>
			{/if}
		</div>
	</div>
</div>
