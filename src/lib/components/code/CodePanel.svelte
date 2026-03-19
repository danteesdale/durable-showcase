<script lang="ts">
	import { codePanelOpen, codePanelStrategy, toggleCodePanel } from '$lib/stores/ui';
	import { ROCKET_CONFIG } from '$lib/constants';
	import { codeSnippets } from './codeSnippets';
	import { highlightCode } from '$lib/highlight';
	import type { StrategyType } from '$lib/simulation/types';

	const strategyTabs: StrategyType[] = ['no-retry', 'polly', 'temporal', 'eda'];
	let selectedTab = $state<StrategyType>('no-retry');
	let fileIndexPerStrategy = $state<Record<string, number>>({});

	// Sync with external strategy selection (e.g. from rocket context menu)
	$effect(() => {
		if ($codePanelStrategy) {
			selectedTab = $codePanelStrategy;
			codePanelStrategy.set(null);
		}
	});

	const snippet = $derived(codeSnippets[selectedTab]);
	const config = $derived(ROCKET_CONFIG[selectedTab]);
	const selectedFileIndex = $derived(fileIndexPerStrategy[selectedTab] ?? 0);
	const currentFile = $derived(snippet.files[selectedFileIndex] ?? snippet.files[0]);

	// Syntax highlighting cache
	let highlightCache = $state<Record<string, string>>({});

	// Cache key for current file
	const cacheKey = $derived(`${selectedTab}:${selectedFileIndex}`);
	const highlightedHtml = $derived(highlightCache[cacheKey]);

	// Trigger highlighting when file changes
	$effect(() => {
		const key = cacheKey;
		const file = currentFile;
		if (highlightCache[key]) return; // already cached

		highlightCode(file.code, file.language).then((html) => {
			highlightCache = { ...highlightCache, [key]: html };
		});
	});

	const complexityLevels: Record<string, number> = { 'Minimal': 1, 'Low': 2, 'Medium': 3, 'High': 4 };
	const durabilityLevels: Record<StrategyType, { level: number; label: string }> = {
		'no-retry': { level: 0, label: 'None' },
		polly: { level: 1, label: 'Transient' },
		temporal: { level: 4, label: 'Full' },
		eda: { level: 3, label: 'High' },
	};

	function selectStrategy(tab: StrategyType) {
		selectedTab = tab;
	}

	function selectFile(index: number) {
		fileIndexPerStrategy = { ...fileIndexPerStrategy, [selectedTab]: index };
	}

	// File tabs scroll state
	let fileTabsEl = $state<HTMLElement | null>(null);
	let canScrollLeft = $state(false);
	let canScrollRight = $state(false);

	function updateScrollIndicators() {
		if (!fileTabsEl) return;
		canScrollLeft = fileTabsEl.scrollLeft > 0;
		canScrollRight = fileTabsEl.scrollLeft + fileTabsEl.clientWidth < fileTabsEl.scrollWidth - 1;
	}

	function scrollFileTabs(dir: 'left' | 'right') {
		if (!fileTabsEl) return;
		fileTabsEl.scrollBy({ left: dir === 'left' ? -120 : 120, behavior: 'smooth' });
	}

	$effect(() => {
		// Re-check scroll indicators when strategy (and thus files) changes
		selectedTab;
		setTimeout(updateScrollIndicators, 0);
	});
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
		class="fixed top-0 left-0 bottom-0 z-40 w-[560px] max-w-[90vw] flex flex-col border-r backdrop-blur-xl code-slide-in"
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

		<!-- Strategy Tabs -->
		<div class="flex border-b" style="border-color: var(--color-panel-border);">
			{#each strategyTabs as tab}
				{@const tabConfig = ROCKET_CONFIG[tab]}
				{@const isActive = selectedTab === tab}
				<button
					onclick={() => selectStrategy(tab)}
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
		<div class="flex-1 overflow-y-auto flex flex-col min-h-0">
			<!-- Title + Complexity -->
			<div class="flex items-center justify-between px-4 pt-2 pb-1 md:pt-3 md:pb-2">
				<h4 class="font-display text-sm font-semibold" style="color: {config.color};">
					{snippet.title}
				</h4>
				<span
					class="px-2 py-0.5 rounded font-mono text-[10px]"
					style="background: {config.color}15; color: {config.color};"
				>
					{snippet.files.length === 1 ? '1 file' : `${snippet.files.length} files`} &middot; {snippet.complexity} complexity
				</span>
			</div>

			<!-- File Tabs (IDE-style, horizontally scrollable) -->
			{#if snippet.files.length > 1}
				<div class="relative flex items-center px-4 pb-1 gap-1">
					<!-- Left arrow -->
					{#if canScrollLeft}
						<button
							onclick={() => scrollFileTabs('left')}
							class="shrink-0 flex items-center justify-center w-5 h-5 rounded transition-colors hover:bg-white/10"
							style="color: {config.color};"
							aria-label="Scroll tabs left"
						>‹</button>
					{:else}
						<div class="shrink-0 w-5 h-5"></div>
					{/if}

					<!-- Scrollable tab strip -->
					<div
						bind:this={fileTabsEl}
						onscroll={updateScrollIndicators}
						class="file-tab-scroll flex gap-1 overflow-x-auto flex-1 min-w-0"
					>
						{#each snippet.files as file, i}
							{@const isFileActive = selectedFileIndex === i}
							<button
								onclick={() => selectFile(i)}
								class="px-2 py-1 font-mono text-[10px] whitespace-nowrap transition-all rounded shrink-0"
								style="
									color: {isFileActive ? config.color : '#64748b'};
									background: {isFileActive ? '#0a0e1a' : '#ffffff05'};
									border: 1px solid {isFileActive ? config.color + '40' : '#ffffff10'};
								"
							>
								{file.filename}
							</button>
						{/each}
					</div>

					<!-- Right arrow -->
					{#if canScrollRight}
						<button
							onclick={() => scrollFileTabs('right')}
							class="shrink-0 flex items-center justify-center w-5 h-5 rounded transition-colors hover:bg-white/10"
							style="color: {config.color};"
							aria-label="Scroll tabs right"
						>›</button>
					{:else}
						<div class="shrink-0 w-5 h-5"></div>
					{/if}
				</div>
			{/if}

			<!-- Code Block -->
			<div class="mx-4 rounded-lg overflow-hidden flex-1 min-h-0 flex flex-col" style="border: 1px solid {config.color}20; {snippet.files.length > 1 ? 'border-top-left-radius: 0;' : ''}">
				{#if snippet.files.length === 1}
					<!-- Single file: show filename as title bar -->
					<div
						class="px-3 py-1.5 font-mono text-[11px] border-b"
						style="background: #0a0e1a; color: {config.color}80; border-color: {config.color}15;"
					>
						{currentFile.filename}
					</div>
				{/if}
				<div class="overflow-auto flex-1 min-h-0 shiki-container">
					{#if highlightedHtml}
						{@html highlightedHtml}
					{:else}
						<pre
							class="p-4 font-mono text-[12px] leading-relaxed"
							style="background: #0a0e1a; color: #e2e8f0;"
						><code>{#each currentFile.code.split('\n') as line, i}<span class="inline-block w-8 text-right mr-3 select-none" style="color: #64748b40;">{i + 1}</span><span class="text-text-secondary">{line}</span>
{/each}</code></pre>
					{/if}
				</div>
			</div>

			<!-- Summary -->
			<div
				class="rounded mx-4 mt-2 mb-1 md:mt-4 md:mb-2 p-2 md:p-3 font-mono text-[11px] max-h-[4.5rem] md:max-h-none overflow-y-auto"
				style="background: {config.color}10; border: 1px solid {config.color}30; color: #c8d0dc;"
			>
				{snippet.summary}
			</div>

			<!-- Comparison Bars -->
			<div class="grid grid-cols-2 md:flex md:flex-col gap-2 md:gap-3 px-4 pb-3 md:pb-4">
				<!-- Complexity -->
				<div class="flex flex-col gap-1 md:gap-1.5">
					<span class="font-mono text-[10px] text-text-muted uppercase tracking-wider">Complexity</span>
					<div class="flex flex-col gap-0.5 md:gap-1">
						{#each strategyTabs as tab}
							{@const s = codeSnippets[tab]}
							{@const c = ROCKET_CONFIG[tab]}
							{@const level = complexityLevels[s.complexity] ?? 1}
							{@const barWidth = (level / 4) * 100}
							<div class="flex items-center gap-1 md:gap-2">
								<span class="font-mono text-[9px] md:text-[11px] w-12 md:w-24 text-right shrink-0 font-semibold" style="color: {c.color};">{c.label}</span>
								<div class="flex-1 h-1.5 md:h-2 rounded-full overflow-hidden" style="background: #ffffff08;">
									<div
										class="h-full rounded-full transition-all duration-300"
										style="width: {barWidth}%; background: {c.color}; opacity: {tab === selectedTab ? 1 : 0.4};"
									></div>
								</div>
								<span class="hidden md:block font-mono text-[11px] w-16 shrink-0" style="color: {c.color};">
									{s.complexity}
								</span>
							</div>
						{/each}
					</div>
				</div>

				<!-- Durability -->
				<div class="flex flex-col gap-1 md:gap-1.5">
					<span class="font-mono text-[10px] text-text-muted uppercase tracking-wider">Durability</span>
					<div class="flex flex-col gap-0.5 md:gap-1">
						{#each strategyTabs as tab}
							{@const d = durabilityLevels[tab]}
							{@const c = ROCKET_CONFIG[tab]}
							{@const barWidth = (d.level / 4) * 100}
							<div class="flex items-center gap-1 md:gap-2">
								<span class="font-mono text-[9px] md:text-[11px] w-12 md:w-24 text-right shrink-0 font-semibold" style="color: {c.color};">{c.label}</span>
								<div class="flex-1 h-1.5 md:h-2 rounded-full overflow-hidden" style="background: #ffffff08;">
									<div
										class="h-full rounded-full transition-all duration-300"
										style="width: {barWidth}%; background: {c.color}; opacity: {tab === selectedTab ? 1 : 0.4};"
									></div>
								</div>
								<span class="hidden md:block font-mono text-[11px] w-16 shrink-0" style="color: {c.color};">
									{d.label}
								</span>
							</div>
						{/each}
					</div>
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

	/* Shiki output styling */
	.shiki-container {
		background: #0a0e1a;
	}

	.shiki-container :global(pre.shiki) {
		padding: 1rem;
		margin: 0;
		font-family: 'JetBrains Mono', monospace;
		font-size: 12px;
		line-height: 1.625;
		background: #0a0e1a !important;
		overflow-x: visible;
		min-width: max-content;
	}

	.shiki-container :global(pre.shiki code) {
		font-family: inherit;
		counter-reset: line;
	}

	.shiki-container :global(pre.shiki code .line) {
		display: inline-block;
		width: 100%;
	}

	.file-tab-scroll {
		scrollbar-width: none;
	}

	.file-tab-scroll::-webkit-scrollbar {
		display: none;
	}

	.shiki-container :global(pre.shiki code .line::before) {
		counter-increment: line;
		content: counter(line);
		display: inline-block;
		width: 2rem;
		margin-right: 0.75rem;
		text-align: right;
		color: #64748b40;
		user-select: none;
	}
</style>
