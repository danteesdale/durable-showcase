<script lang="ts">
	import { codePanelOpen, toggleCodePanel } from '$lib/stores/ui';
	import { ROCKET_CONFIG } from '$lib/constants';
	import { codeSnippets } from './codeSnippets';
	import type { StrategyType } from '$lib/simulation/types';

	const tabs: StrategyType[] = ['temporal', 'polly', 'no-retry', 'eda'];
	let selectedTab = $state<StrategyType>('temporal');

	const snippet = $derived(codeSnippets[selectedTab]);
	const config = $derived(ROCKET_CONFIG[selectedTab]);
</script>

{#if $codePanelOpen}
	<!-- Backdrop -->
	<button
		class="fixed inset-0 z-30 bg-black/40"
		onclick={toggleCodePanel}
		aria-label="Close panel"
	></button>

	<!-- Panel -->
	<div
		class="fixed top-0 left-0 bottom-0 z-40 w-[520px] max-w-[90vw] flex flex-col border-r backdrop-blur-xl code-slide-in"
		style="background: var(--color-panel-bg); border-color: var(--color-panel-border);"
	>
		<!-- Header -->
		<div class="flex items-center justify-between px-4 py-3 border-b" style="border-color: var(--color-panel-border);">
			<h3 class="font-display text-sm font-semibold text-text-primary tracking-wider uppercase">
				Code Comparison
			</h3>
			<button
				onclick={toggleCodePanel}
				class="font-mono text-xs text-text-muted hover:text-text-primary transition-colors px-2 py-1 rounded hover:bg-white/5"
			>
				✕
			</button>
		</div>

		<!-- Tabs -->
		<div class="flex border-b" style="border-color: var(--color-panel-border);">
			{#each tabs as tab}
				{@const tabConfig = ROCKET_CONFIG[tab]}
				{@const isActive = selectedTab === tab}
				<button
					onclick={() => { selectedTab = tab; }}
					class="flex-1 px-3 py-2 font-mono text-[11px] font-bold transition-all relative"
					style="
						color: {isActive ? tabConfig.color : '#64748b'};
						background: {isActive ? tabConfig.color + '10' : 'transparent'};
					"
				>
					{tabConfig.label}
					{#if isActive}
						<div class="absolute bottom-0 left-0 right-0 h-0.5" style="background: {tabConfig.color};"></div>
					{/if}
				</button>
			{/each}
		</div>

		<!-- Code Content -->
		<div class="flex-1 overflow-y-auto p-4 flex flex-col gap-3 min-h-0">
			<!-- Title + Stats -->
			<div class="flex items-center justify-between">
				<h4 class="font-display text-sm font-semibold" style="color: {config.color};">
					{snippet.title}
				</h4>
				<div class="flex items-center gap-2 font-mono text-[10px]">
					<span
						class="px-1.5 py-0.5 rounded"
						style="background: {config.color}15; color: {config.color};"
					>
						{snippet.lineCount} lines
					</span>
					<span
						class="px-1.5 py-0.5 rounded"
						style="background: {config.color}15; color: {config.color};"
					>
						{snippet.fileCount} {snippet.fileCount === 1 ? 'file' : 'files'}
					</span>
				</div>
			</div>

			<!-- Code Block -->
			<div class="rounded-lg overflow-hidden flex-1 min-h-0" style="border: 1px solid {config.color}20;">
				<div class="overflow-auto h-full">
					<pre
						class="p-4 font-mono text-[12px] leading-relaxed"
						style="background: #0a0e1a; color: #e2e8f0;"
					><code>{#each snippet.code.split('\n') as line, i}<span class="inline-block w-8 text-right mr-3 select-none" style="color: #64748b40;">{i + 1}</span><span class="text-text-secondary">{line}</span>
{/each}</code></pre>
				</div>
			</div>

			<!-- Summary -->
			<div
				class="rounded p-3 font-mono text-[11px]"
				style="background: {config.color}08; border: 1px solid {config.color}20; color: {config.color}cc;"
			>
				{snippet.summary}
			</div>

			<!-- LOC Comparison Bar -->
			<div class="flex flex-col gap-1.5">
				<span class="font-mono text-[10px] text-text-muted uppercase tracking-wider">Lines of Code Comparison</span>
				<div class="flex flex-col gap-1">
					{#each tabs as tab}
						{@const s = codeSnippets[tab]}
						{@const c = ROCKET_CONFIG[tab]}
						{@const barWidth = Math.min(100, (s.lineCount / 350) * 100)}
						<div class="flex items-center gap-2">
							<span class="font-mono text-[10px] w-24 text-right shrink-0" style="color: {c.color}80;">{c.label}</span>
							<div class="flex-1 h-2 rounded-full overflow-hidden" style="background: #ffffff08;">
								<div
									class="h-full rounded-full"
									style="width: {barWidth}%; background: {c.color}; opacity: {tab === selectedTab ? 1 : 0.4};"
								></div>
							</div>
							<span class="font-mono text-[10px] w-12 shrink-0" style="color: {c.color}80;">{s.lineCount}L</span>
						</div>
					{/each}
				</div>
			</div>
		</div>
	</div>
{/if}

<style>
	.code-slide-in {
		animation: slide-in-left 0.25s ease-out;
	}

	@keyframes slide-in-left {
		from { transform: translateX(-100%); }
		to { transform: translateX(0); }
	}
</style>
