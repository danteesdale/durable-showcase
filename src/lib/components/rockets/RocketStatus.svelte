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

<div class="flex items-center gap-2 min-w-[180px]">
	<!-- Strategy name -->
	<span class="font-display text-sm font-semibold" style="color: {config.color};">
		{config.label}
	</span>

	<!-- State badge -->
	<span
		class="font-mono text-[10px] px-1.5 py-0.5 rounded-full"
		style="background: {stateColor()}20; color: {stateColor()};"
	>
		{stateLabel()}
	</span>

	<!-- Call counter -->
	{#if state !== 'idle'}
		<span class="font-mono text-[10px] text-text-muted">
			{completedCalls}/{totalCalls}
		</span>
	{/if}
</div>
