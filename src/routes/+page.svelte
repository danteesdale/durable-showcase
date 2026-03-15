<script lang="ts">
	import SpaceScene from '$lib/components/space/SpaceScene.svelte';
	import ControlPanel from '$lib/components/controls/ControlPanel.svelte';
	import { rockets } from '$lib/stores/simulation';
</script>

<div class="h-screen w-screen bg-space-bg flex flex-col overflow-hidden">
	<!-- Header -->
	<header class="relative z-20 px-6 py-3 flex items-center justify-between border-b" style="border-color: var(--color-panel-border);">
		<div>
			<h1 class="font-display text-xl font-bold text-text-primary">Durable Showcase</h1>
			<p class="font-body text-xs text-text-muted">Why Durable Execution Matters</p>
		</div>
		<div class="font-mono text-[10px] text-text-muted">
			250 service calls &middot; 6 stages &middot; 26 service groups
		</div>
	</header>

	<!-- Space scene with rockets -->
	<SpaceScene rockets={$rockets} />

	<!-- Control panel -->
	<ControlPanel />
</div>
