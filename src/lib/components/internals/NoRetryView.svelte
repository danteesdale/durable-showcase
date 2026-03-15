<script lang="ts">
	import EventLog from './EventLog.svelte';
	import type { RocketSimulation } from '$lib/simulation/types';
	import { ROCKET_CONFIG } from '$lib/constants';

	interface Props {
		rocket: RocketSimulation;
	}

	let { rocket }: Props = $props();

	const config = ROCKET_CONFIG['no-retry'];

	const lastFailure = $derived(
		rocket.eventLog.find(e => e.type === 'CallFailed' || e.type === 'TerminalFailure')
	);
</script>

<div class="flex flex-col gap-3 h-full">
	<!-- Status -->
	<div class="flex flex-col gap-1.5">
		<span class="font-mono text-[10px] text-text-muted uppercase tracking-wider">Strategy</span>
		<div class="rounded p-2 font-mono text-[11px]" style="background: #ffffff06; border: 1px solid #ffffff08;">
			<span class="text-text-secondary">No error handling. No retries. Any failure = unhandled exception = crash.</span>
		</div>
	</div>

	<!-- Progress at failure -->
	<div class="flex flex-col gap-1.5">
		<span class="font-mono text-[10px] text-text-muted uppercase tracking-wider">Progress</span>
		<div class="grid grid-cols-3 gap-2">
			<div class="rounded p-2 text-center" style="background: #ffffff06; border: 1px solid #ffffff08;">
				<div class="font-mono text-[10px] text-text-muted">Calls</div>
				<div class="font-mono text-sm font-bold" style="color: {config.color};">{rocket.completedCalls}/{rocket.totalCalls}</div>
			</div>
			<div class="rounded p-2 text-center" style="background: #ffffff06; border: 1px solid #ffffff08;">
				<div class="font-mono text-[10px] text-text-muted">Retries</div>
				<div class="font-mono text-sm font-bold" style="color: {config.color};">0</div>
			</div>
			<div class="rounded p-2 text-center" style="background: #ffffff06; border: 1px solid #ffffff08;">
				<div class="font-mono text-[10px] text-text-muted">Max Retries</div>
				<div class="font-mono text-sm font-bold" style="color: {config.color};">0</div>
			</div>
		</div>
	</div>

	{#if rocket.state === 'failed' && lastFailure}
		<div class="rounded p-3 font-mono text-[11px]" style="background: #e6394615; border: 1px solid #e6394630;">
			<div class="font-bold mb-1" style="color: #e63946;">UNHANDLED EXCEPTION</div>
			<div class="text-text-secondary">{lastFailure.message}</div>
			<div class="text-text-muted mt-1 text-[10px]">Process terminated. All progress lost. No recovery possible.</div>
		</div>
	{/if}

	<!-- Key Point -->
	<div class="rounded p-2 font-mono text-[11px] leading-relaxed" style="background: #f0a0a810; border: 1px solid #d0708030; color: #c8d0dc;">
		The baseline: no retries, no recovery, no durability. With 250 service calls, even 99% per-call reliability gives only an 8% chance of mission success. Every other strategy builds on this same business logic — the question is how much complexity you add to survive failures.
	</div>

	<!-- Event Log -->
	<div class="flex-1 min-h-0">
		<EventLog events={rocket.eventLog} color={config.color} />
	</div>
</div>
