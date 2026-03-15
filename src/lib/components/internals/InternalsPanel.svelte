<script lang="ts">
	import { internalsPanelOpen, selectedRocket, toggleInternalsPanel } from '$lib/stores/ui';
	import { rockets } from '$lib/stores/simulation';
	import { ROCKET_CONFIG } from '$lib/constants';
	import type { StrategyType } from '$lib/simulation/types';
	import TemporalView from './TemporalView.svelte';
	import PollyView from './PollyView.svelte';
	import EdaView from './EdaView.svelte';
	import NoRetryView from './NoRetryView.svelte';

	const tabs: StrategyType[] = ['temporal', 'polly', 'no-retry', 'eda'];

	function selectTab(tab: StrategyType) {
		selectedRocket.set(tab);
	}

	const currentRocket = $derived(
		$rockets.find(r => r.id === $selectedRocket)
	);
</script>

{#if $internalsPanelOpen}
	<!-- Backdrop -->
	<button
		class="fixed inset-0 z-30 bg-black/40"
		onclick={toggleInternalsPanel}
		aria-label="Close panel"
	></button>

	<!-- Panel -->
	<div
		class="fixed top-0 right-0 bottom-0 z-40 w-[440px] max-w-[90vw] flex flex-col border-l backdrop-blur-xl internals-slide-in"
		style="background: var(--color-panel-bg); border-color: var(--color-panel-border);"
	>
		<!-- Header -->
		<div class="flex items-center justify-between px-4 py-3 border-b" style="border-color: var(--color-panel-border);">
			<h3 class="font-display text-sm font-semibold text-text-primary tracking-wider uppercase">
				Infrastructure Internals
			</h3>
			<button
				onclick={toggleInternalsPanel}
				class="font-mono text-xs text-text-muted hover:text-text-primary transition-colors px-2 py-1 rounded hover:bg-white/5"
			>
				✕
			</button>
		</div>

		<!-- Tabs -->
		<div class="flex border-b" style="border-color: var(--color-panel-border);">
			{#each tabs as tab}
				{@const config = ROCKET_CONFIG[tab]}
				{@const isActive = $selectedRocket === tab}
				<button
					onclick={() => selectTab(tab)}
					class="flex-1 px-3 py-2 font-mono text-[11px] font-bold transition-all relative"
					style="
						color: {isActive ? config.color : '#64748b'};
						background: {isActive ? config.color + '10' : 'transparent'};
					"
				>
					{config.label}
					{#if isActive}
						<div class="absolute bottom-0 left-0 right-0 h-0.5" style="background: {config.color};"></div>
					{/if}
				</button>
			{/each}
		</div>

		<!-- Content -->
		<div class="flex-1 overflow-y-auto p-4 min-h-0">
			{#if currentRocket}
				{#if $selectedRocket === 'temporal'}
					<TemporalView rocket={currentRocket} />
				{:else if $selectedRocket === 'polly'}
					<PollyView rocket={currentRocket} />
				{:else if $selectedRocket === 'eda'}
					<EdaView rocket={currentRocket} />
				{:else if $selectedRocket === 'no-retry'}
					<NoRetryView rocket={currentRocket} />
				{/if}
			{/if}
		</div>
	</div>
{/if}

<style>
	.internals-slide-in {
		animation: slide-in-right 0.25s ease-out;
	}

	@keyframes slide-in-right {
		from { transform: translateX(100%); }
		to { transform: translateX(0); }
	}
</style>
