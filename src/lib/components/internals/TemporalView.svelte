<script lang="ts">
	import EventLog from './EventLog.svelte';
	import type { RocketSimulation } from '$lib/simulation/types';
	import { ROCKET_CONFIG } from '$lib/constants';

	interface Props {
		rocket: RocketSimulation;
	}

	let { rocket }: Props = $props();

	const config = ROCKET_CONFIG['temporal'];

	const workflowState = $derived(
		rocket.state === 'completed' ? 'Completed'
		: rocket.state === 'failed' ? 'Failed'
		: rocket.state === 'idle' ? 'Not Started'
		: rocket.state === 'paused' ? 'Waiting for Retry'
		: 'Running'
	);

	const workflowStateColor = $derived(
		rocket.state === 'completed' ? '#06d6a0'
		: rocket.state === 'paused' ? '#ffd60a'
		: rocket.state === 'failed' ? '#e63946'
		: config.color
	);
</script>

<div class="flex flex-col gap-3 h-full">
	<!-- Workflow State -->
	<div class="flex flex-col gap-1.5">
		<span class="font-mono text-[10px] text-text-muted uppercase tracking-wider">Workflow State</span>
		<div class="flex items-center gap-3 font-mono text-xs">
			<div class="flex items-center gap-1.5">
				<div class="w-2 h-2 rounded-full" style="background: {workflowStateColor};"></div>
				<span style="color: {workflowStateColor};">{workflowState}</span>
			</div>
			<span class="text-text-muted">|</span>
			<span class="text-text-secondary">Retries: <span class="font-bold" style="color: {config.color};">{rocket.totalRetries}</span></span>
			<span class="text-text-muted">|</span>
			<span class="text-text-secondary">Max: <span class="font-bold" style="color: {config.color};">∞</span></span>
		</div>
	</div>

	<!-- Preserved State -->
	{#if Object.keys(rocket.preservedState).length > 0}
		<div class="flex flex-col gap-1">
			<span class="font-mono text-[10px] text-text-muted uppercase tracking-wider">Preserved State</span>
			<div class="font-mono text-[11px] rounded p-2" style="background: #0a0e1a80; border: 1px solid {config.color}20;">
				<span style="color: {config.color};">{`{`}</span>
				{#each Object.entries(rocket.preservedState) as [key, value]}
					<div class="pl-3">
						<span class="text-text-muted">{key}:</span>
						<span class="text-text-secondary">{JSON.stringify(value)}</span>
					</div>
				{/each}
				<span style="color: {config.color};">{`}`}</span>
			</div>
		</div>
	{/if}

	<!-- Workflow History (Temporal Web UI style) -->
	<div class="flex flex-col gap-1 flex-1 min-h-0">
		<span class="font-mono text-[10px] text-text-muted uppercase tracking-wider">
			Workflow History ({rocket.workflowHistory.length} events)
		</span>
		<div class="flex-1 overflow-y-auto font-mono text-[11px] rounded p-2 min-h-0" style="background: #0a0e1a80; border: 1px solid #ffffff08;">
			{#if rocket.workflowHistory.length === 0}
				<span class="text-text-muted italic">Workflow not started...</span>
			{:else}
				{#each rocket.workflowHistory as event}
					{@const isFailure = event.eventType === 'ActivityTaskFailed'}
					{@const isSuccess = event.eventType === 'ActivityTaskCompleted' || event.eventType === 'WorkflowExecutionCompleted'}
					{@const isTimer = event.eventType === 'TimerStarted' || event.eventType === 'TimerFired'}
					<div class="py-0.5 border-b border-white/5 last:border-0 flex gap-2">
						<span class="text-text-muted w-6 text-right shrink-0">#{event.eventId}</span>
						<span
							class="font-bold shrink-0"
							style="color: {isFailure ? '#e63946' : isSuccess ? '#06d6a0' : isTimer ? '#ffd60a' : config.color};"
						>
							{event.eventType}
						</span>
						{#if Object.keys(event.attributes).length > 0}
							<span class="text-text-muted truncate">
								{JSON.stringify(event.attributes)}
							</span>
						{/if}
					</div>
				{/each}
			{/if}
		</div>
	</div>

	<!-- Key Advantage -->
	<div class="rounded p-2 font-mono text-[11px] leading-relaxed" style="background: #00b4d810; border: 1px solid #00b4d830; color: #c8d0dc;">
		Durable execution preserves workflow state across any failure — unlike Standard Retries or No Retries, nothing is lost on crash. Infinite retries with exponential backoff mean the workflow always resumes from exactly where it left off. Same durability as Event-Driven, but without the distributed saga complexity.
	</div>

	<!-- Event Log -->
	<div class="flex-1 min-h-0">
		<EventLog events={rocket.eventLog} color={config.color} />
	</div>
</div>
