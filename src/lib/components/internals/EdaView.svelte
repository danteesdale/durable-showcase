<script lang="ts">
	import EventLog from './EventLog.svelte';
	import type { RocketSimulation } from '$lib/simulation/types';
	import { ROCKET_CONFIG, TIMING } from '$lib/constants';

	interface Props {
		rocket: RocketSimulation;
	}

	let { rocket }: Props = $props();

	const config = ROCKET_CONFIG['eda'];

	const totalRetryBudget = $derived(TIMING.NSERVICEBUS_IMMEDIATE_RETRIES + TIMING.NSERVICEBUS_DELAYED_RETRIES);
	const retriesUsed = $derived(totalRetryBudget - rocket.immediateRetriesRemaining - rocket.delayedRetriesRemaining);
	const retryPhase = $derived(
		rocket.immediateRetriesRemaining > 0 ? 'Immediate'
		: rocket.delayedRetriesRemaining > 0 ? 'Delayed'
		: 'Exhausted'
	);

	const sagaEntries = $derived(Object.entries(rocket.sagaState));
</script>

<div class="flex flex-col gap-3 h-full">
	<!-- Retry Pipeline -->
	<div class="flex flex-col gap-1.5">
		<span class="font-mono text-[10px] text-text-muted uppercase tracking-wider">Retry Pipeline</span>
		<div class="flex gap-1">
			<!-- Immediate retries -->
			{#each { length: TIMING.NSERVICEBUS_IMMEDIATE_RETRIES } as _, i}
				{@const used = TIMING.NSERVICEBUS_IMMEDIATE_RETRIES - rocket.immediateRetriesRemaining > i}
				<div
					class="h-3 flex-1 rounded-sm transition-all duration-200"
					style="background: {used ? config.color : '#ffffff10'}; opacity: {used ? 1 : 0.3};"
					title="Immediate retry {i + 1}"
				></div>
			{/each}
			<div class="w-px h-3 mx-0.5" style="background: #ffffff30;"></div>
			<!-- Delayed retries -->
			{#each { length: TIMING.NSERVICEBUS_DELAYED_RETRIES } as _, i}
				{@const used = TIMING.NSERVICEBUS_DELAYED_RETRIES - rocket.delayedRetriesRemaining > i}
				<div
					class="h-3 flex-1 rounded-sm transition-all duration-200"
					style="background: {used ? '#ffd60a' : '#ffffff10'}; opacity: {used ? 1 : 0.3};"
					title="Delayed retry {i + 1}"
				></div>
			{/each}
		</div>
		<div class="flex justify-between font-mono text-[9px] text-text-muted">
			<span>Immediate ({TIMING.NSERVICEBUS_IMMEDIATE_RETRIES})</span>
			<span>Delayed ({TIMING.NSERVICEBUS_DELAYED_RETRIES})</span>
			<span class="font-bold" style="color: {retryPhase === 'Exhausted' ? '#e63946' : config.color};">{retryPhase}</span>
		</div>
	</div>

	<!-- Error Queue -->
	<div class="flex flex-col gap-1">
		<span class="font-mono text-[10px] text-text-muted uppercase tracking-wider">
			Error Queue ({rocket.errorQueueMessages.length} messages)
		</span>
		<div class="rounded p-2 max-h-24 overflow-y-auto" style="background: {rocket.errorQueueMessages.length > 0 ? '#e6394610' : '#0a0e1a80'}; border: 1px solid {rocket.errorQueueMessages.length > 0 ? '#e6394630' : '#ffffff08'};">
			{#if rocket.errorQueueMessages.length === 0}
				<span class="font-mono text-[11px] text-text-muted italic">Empty</span>
			{:else}
				{#each rocket.errorQueueMessages as msg}
					<div class="font-mono text-[11px] py-0.5 border-b border-white/5 last:border-0">
						<span style="color: #e63946;">⚠</span>
						<span class="text-text-secondary">{msg.messageType}</span>
						<span class="text-text-muted">→ {msg.originalDestination}</span>
						<span class="text-text-muted opacity-50">({msg.lastError})</span>
					</div>
				{/each}
			{/if}
		</div>
	</div>

	<!-- Saga State -->
	<div class="flex flex-col gap-1">
		<span class="font-mono text-[10px] text-text-muted uppercase tracking-wider">Saga State</span>
		<div class="flex gap-1.5 flex-wrap">
			{#each sagaEntries as [stage, status]}
				{@const stageColor = status === 'completed' ? '#06d6a0' : status === 'failed' ? '#e63946' : '#64748b'}
				{@const stageIcon = status === 'completed' ? '✓' : status === 'failed' ? '✕' : '○'}
				<div
					class="font-mono text-[10px] px-1.5 py-0.5 rounded"
					style="background: {stageColor}15; color: {stageColor}; border: 1px solid {stageColor}30;"
				>
					{stageIcon} {stage}
				</div>
			{/each}
		</div>
	</div>

	<!-- Key Difference -->
	<div class="rounded p-2 font-mono text-[11px]" style="background: {config.color}10; border: 1px solid {config.color}20; color: {config.color}99;">
		Messages are durable — but exhausted retries require manual intervention via error queue tooling. Each stage needs a saga, handlers, and message classes (~350 lines across 20+ files).
	</div>

	<!-- Event Log -->
	<div class="flex-1 min-h-0">
		<EventLog events={rocket.eventLog} color={config.color} />
	</div>
</div>
