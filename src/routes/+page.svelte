<script lang="ts">
	import SpaceScene from '$lib/components/space/SpaceScene.svelte';
	import ControlPanel from '$lib/components/controls/ControlPanel.svelte';
	import InternalsPanel from '$lib/components/internals/InternalsPanel.svelte';
	import CodePanel from '$lib/components/code/CodePanel.svelte';
	import GuidedTour from '$lib/components/tour/GuidedTour.svelte';
	import { rockets, launch, reset, isRunning, speedMultiplier } from '$lib/stores/simulation';
	import { toggleCodePanel, toggleInternalsPanel, startTour, tourActive } from '$lib/stores/ui';
	import { SPEED_OPTIONS } from '$lib/constants';

	function handleKeydown(e: KeyboardEvent) {
		// Don't handle shortcuts during tour (tour has its own handlers)
		if ($tourActive) return;
		// Don't handle if user is in an input
		if ((e.target as HTMLElement)?.tagName === 'INPUT') return;

		switch (e.key) {
			case ' ':
				e.preventDefault();
				if (!$isRunning) launch();
				break;
			case 'r':
				reset();
				break;
			case '1':
				speedMultiplier.set(SPEED_OPTIONS[0]);
				break;
			case '2':
				speedMultiplier.set(SPEED_OPTIONS[1]);
				break;
			case '3':
				speedMultiplier.set(SPEED_OPTIONS[2]);
				break;
			case '4':
				speedMultiplier.set(SPEED_OPTIONS[3]);
				break;
			case 'c':
				toggleCodePanel();
				break;
			case 'i':
				toggleInternalsPanel();
				break;
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="h-screen w-screen bg-space-bg flex flex-col overflow-hidden">
	<!-- Header -->
	<header class="relative z-20 px-6 py-3 flex items-center justify-between border-b" style="border-color: var(--color-panel-border);">
		<div>
			<h1 class="font-display text-xl font-bold text-text-primary">Durable Showcase</h1>
			<p class="font-body text-xs text-text-muted">Why Durable Execution Matters</p>
		</div>
		<div class="flex items-center gap-3">
			<button
				onclick={startTour}
				class="px-2.5 py-1 rounded text-[10px] font-mono font-bold border transition-colors hover:bg-cyan-500/10"
				style="border-color: #00b4d840; color: #00b4d8;"
			>
				Guided Tour
			</button>
			<button
				onclick={toggleCodePanel}
				class="px-2.5 py-1 rounded text-[10px] font-mono border transition-colors hover:bg-white/5"
				style="border-color: #ffffff15; color: #94a3b8;"
			>
				&#x2630; Code
			</button>
			<button
				onclick={toggleInternalsPanel}
				class="px-2.5 py-1 rounded text-[10px] font-mono border transition-colors hover:bg-white/5"
				style="border-color: #ffffff15; color: #94a3b8;"
			>
				&#x2699; Internals
			</button>
			<span class="font-mono text-[10px] text-text-muted">
				250 service calls &middot; 6 stages &middot; 26 service groups
			</span>
		</div>
	</header>

	<!-- Space scene with rockets -->
	<div data-tour="rocket-lanes" class="flex-1 min-h-0 flex flex-col">
		<SpaceScene rockets={$rockets} />
	</div>

	<!-- Control panel -->
	<div data-tour="controls">
		<ControlPanel />
	</div>

	<!-- Slide-out panels -->
	<CodePanel />
	<InternalsPanel />

	<!-- Guided tour overlay -->
	<GuidedTour />
</div>
