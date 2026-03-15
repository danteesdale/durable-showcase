<script lang="ts">
	import EventLog from './EventLog.svelte';
	import type { RocketSimulation } from '$lib/simulation/types';
	import { ROCKET_CONFIG, TIMING } from '$lib/constants';

	interface Props {
		rocket: RocketSimulation;
	}

	let { rocket }: Props = $props();

	const config = ROCKET_CONFIG['polly'];

	const retriesUsed = $derived(rocket.retryCount);
	const maxRetries = $derived(TIMING.POLLY_MAX_RETRIES);
	const retryBarWidth = $derived(Math.min(100, (retriesUsed / maxRetries) * 100));

	const backoffDisplay = $derived(
		rocket.currentBackoffMs > 0
			? `${(rocket.currentBackoffMs / 1000).toFixed(1)}s`
			: '—'
	);
</script>

<div class="flex flex-col gap-3 h-full">
	<!-- Retry Budget -->
	<div class="flex flex-col gap-1.5">
		<span class="font-mono text-[10px] text-text-muted uppercase tracking-wider">Retry Budget</span>
		<div class="flex items-center gap-3">
			<div class="flex-1 h-2 rounded-full overflow-hidden" style="background: #ffffff10;">
				<div
					class="h-full rounded-full transition-all duration-300"
					style="width: {retryBarWidth}%; background: {retryBarWidth >= 100 ? '#e63946' : retryBarWidth >= 60 ? '#f48c06' : config.color};"
				></div>
			</div>
			<span class="font-mono text-xs font-bold" style="color: {retryBarWidth >= 100 ? '#e63946' : config.color};">
				{retriesUsed}/{maxRetries}
			</span>
		</div>
	</div>

	<!-- Current State -->
	<div class="flex flex-col gap-1.5">
		<span class="font-mono text-[10px] text-text-muted uppercase tracking-wider">Retry State</span>
		<div class="grid grid-cols-3 gap-2">
			<div class="rounded p-2 text-center" style="background: #ffffff06; border: 1px solid #ffffff08;">
				<div class="font-mono text-[10px] text-text-muted">Backoff</div>
				<div class="font-mono text-sm font-bold" style="color: {config.color};">{backoffDisplay}</div>
			</div>
			<div class="rounded p-2 text-center" style="background: #ffffff06; border: 1px solid #ffffff08;">
				<div class="font-mono text-[10px] text-text-muted">Total Retries</div>
				<div class="font-mono text-sm font-bold" style="color: {config.color};">{rocket.totalRetries}</div>
			</div>
			<div class="rounded p-2 text-center" style="background: #ffffff06; border: 1px solid #ffffff08;">
				<div class="font-mono text-[10px] text-text-muted">Progress</div>
				<div class="font-mono text-sm font-bold" style="color: {config.color};">{rocket.completedCalls}/{rocket.totalCalls}</div>
			</div>
		</div>
	</div>

	<!-- Key Limitation -->
	<div class="rounded p-2 font-mono text-[11px] leading-relaxed" style="background: #f48c0625; border: 1px solid #f48c0640; color: #f8c080;">
		Retries help with transient faults, but there's no state preservation — if retries are exhausted on any single call, all progress is lost. A process crash means starting over from scratch.
	</div>

	<!-- Event Log -->
	<div class="flex-1 min-h-0">
		<EventLog events={rocket.eventLog} color={config.color} />
	</div>
</div>
