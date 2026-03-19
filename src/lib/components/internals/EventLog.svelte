<script lang="ts">
	import type { SimulationEvent } from '$lib/simulation/types';

	interface Props {
		events: SimulationEvent[];
		color: string;
	}

	let { events, color }: Props = $props();

	let logEl: HTMLDivElement | undefined = $state();

	// Auto-scroll to bottom only if the user hasn't scrolled up
	$effect(() => {
		if (events.length && logEl) {
			const isAtBottom = logEl.scrollHeight - logEl.scrollTop - logEl.clientHeight < 50;
			if (isAtBottom) {
				logEl.scrollTop = logEl.scrollHeight;
			}
		}
	});
</script>

<div class="flex flex-col gap-1 h-full">
	<span class="font-mono text-[10px] text-text-muted uppercase tracking-wider">Event Log</span>
	<div
		bind:this={logEl}
		class="flex-1 overflow-y-auto font-mono text-[11px] leading-relaxed rounded p-2 min-h-0"
		style="background: #0a0e1a80; border: 1px solid #ffffff08;"
	>
		{#if events.length === 0}
			<span class="text-text-muted italic">No events yet...</span>
		{:else}
			{#each events as event, i}
				<div class="py-0.5 border-b border-white/5 last:border-0">
					<span class="text-text-muted opacity-50">{String(i + 1).padStart(3, ' ')}</span>
					<span style="color: {color}80;">|</span>
					<span class="text-text-secondary">{event.message}</span>
				</div>
			{/each}
		{/if}
	</div>
</div>
