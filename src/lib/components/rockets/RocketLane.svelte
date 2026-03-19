<script lang="ts">
	import { tweened } from 'svelte/motion';
	import { cubicOut, cubicIn, sineInOut } from 'svelte/easing';
	import Rocket from './Rocket.svelte';
	import RocketStatus from './RocketStatus.svelte';
	import ExhaustTrail from './ExhaustTrail.svelte';
	import Explosion from './Explosion.svelte';
	import SuccessEffect from './SuccessEffect.svelte';
	import RepairShip from './RepairShip.svelte';
	import type { RocketSimulation } from '$lib/simulation/types';
	import { ROCKET_CONFIG } from '$lib/constants';
	import { MISSION } from '$lib/simulation/missionStages';
	import { selectRocket, selectRocketCode } from '$lib/stores/ui';

	interface Props {
		rocket: RocketSimulation;
	}

	let { rocket }: Props = $props();

	const config = $derived(ROCKET_CONFIG[rocket.id]);

	// Smooth position animation
	const position = tweened(0, { duration: 200, easing: cubicOut });

	$effect(() => {
		position.set(rocket.overallProgress);
	});

	// Track area dimensions for particle positioning
	let trackEl: HTMLDivElement | undefined = $state();
	let trackWidth = $state(800);
	let trackHeight = $state(56);

	$effect(() => {
		if (trackEl) {
			const observer = new ResizeObserver((entries) => {
				for (const entry of entries) {
					trackWidth = entry.contentRect.width;
					trackHeight = entry.contentRect.height;
				}
			});
			observer.observe(trackEl);
			return () => observer.disconnect();
		}
	});

	// Responsive rocket sizing: smaller on mobile
	const isMobile = $derived(trackWidth < 500);
	const rocketScale = $derived(isMobile ? 0.75 : 1);
	const rocketWidth = $derived(82 * rocketScale);
	const rocketOffset = $derived(rocketWidth / 2);

	// Position so nose (right edge) aligns with progress point
	const rocketPixelX = $derived($position * trackWidth - rocketWidth / 2 + 12);
	const nozzleX = $derived(rocketPixelX); // nozzle is at the left of the rocket
	const nozzleY = $derived(trackHeight / 2);

	// Stage boundaries as percentages
	const stageBoundaries = $derived(() => {
		let cumulative = 0;
		const totalCalls = MISSION.totalCalls;
		return MISSION.stages.map((stage) => {
			const stageCalls = stage.groups.reduce((s, g) => s + g.calls.length, 0);
			const start = cumulative / totalCalls;
			cumulative += stageCalls;
			const end = cumulative / totalCalls;
			return { name: stage.name, start, end, groups: stage.groups.length };
		});
	});

	// Cluster status for each group
	function getGroupStatus(stageIdx: number, groupIdx: number) {
		const groupResult = rocket.stageResults[stageIdx]?.[groupIdx];
		if (!groupResult) return 'pending';
		return groupResult.status;
	}

	const clusterColor = (status: string) => {
		switch (status) {
			case 'success':
				return '#06d6a0';
			case 'in-progress':
				return '#ffffff';
			case 'failed':
				return '#e63946';
			case 'retrying':
				return '#ffd60a';
			default:
				return '#64748b';
		}
	};

	// Cascade sweep for first-to-complete: compute a flat index for each dot
	// so we can assign staggered CSS animation delays
	let cascadeActive = $state(false);

	// Build a flat list of dot indices for stagger timing
	const dotFlatIndex = $derived(() => {
		const boundaries = stageBoundaries();
		const indices: number[][] = []; // [stageIdx][groupIdx] → flat index
		let idx = 0;
		for (let s = 0; s < boundaries.length; s++) {
			indices[s] = [];
			for (let g = 0; g < boundaries[s].groups; g++) {
				indices[s][g] = idx++;
			}
		}
		return { indices, total: idx };
	});

	$effect(() => {
		if (rocket.isFirstToComplete && !cascadeActive) {
			cascadeActive = true;
		}
		if (rocket.state === 'idle') {
			cascadeActive = false;
		}
	});

	// Track stage completions for subtle green cascade
	let completedStages = $state<Set<number>>(new Set());
	let animatingStages = $state<Set<number>>(new Set());

	function isStageComplete(stageIdx: number): boolean {
		const stageResults = rocket.stageResults[stageIdx];
		if (!stageResults || stageResults.length === 0) return false;
		return stageResults.every(g => g.status === 'success');
	}

	$effect(() => {
		const boundaries = stageBoundaries();
		for (let s = 0; s < boundaries.length; s++) {
			if (isStageComplete(s) && !completedStages.has(s)) {
				completedStages = new Set([...completedStages, s]);
				animatingStages = new Set([...animatingStages, s]);
				// Remove animating state after animation completes
				const maxDots = boundaries[s].groups;
				const animDuration = maxDots * 50 + 600; // stagger + animation time
				setTimeout(() => {
					animatingStages = new Set([...animatingStages].filter(x => x !== s));
				}, animDuration);
			}
		}
		if (rocket.state === 'idle') {
			completedStages = new Set();
			animatingStages = new Set();
		}
	});

	// Track effect states
	const showExplosion = $derived(rocket.state === 'failed');
	const showSuccess = $derived(rocket.state === 'completed' && rocket.isFirstToComplete);
	const repairPhase = $derived(
		rocket.state === 'repair-approaching' ? 'approaching' as const
		: rocket.state === 'repair-docked' ? 'docked' as const
		: rocket.state === 'repair-departing' ? 'departing' as const
		: 'gone' as const
	);
	const showRepairShip = $derived(repairPhase !== 'gone');
	const isStalled = $derived(rocket.state === 'error-queue-stalled');

	// Completion animation — winner swoops to planet center, losers fly off into space
	let isAnimating = $state(false);
	let animType = $state<'winner' | 'loser' | null>(null);
	let swoopPath = $state<{ c1x: number; c1y: number; c2x: number; c2y: number; dx: number; dy: number } | null>(null);
	const animProgress = tweened(0);

	function cubicBezierVal(t: number, p0: number, p1: number, p2: number, p3: number) {
		const mt = 1 - t;
		return mt * mt * mt * p0 + 3 * mt * mt * t * p1 + 3 * mt * t * t * p2 + t * t * t * p3;
	}

	function cubicBezierDeriv(t: number, p0: number, p1: number, p2: number, p3: number) {
		const mt = 1 - t;
		return 3 * mt * mt * (p1 - p0) + 6 * mt * t * (p2 - p1) + 3 * t * t * (p3 - p2);
	}

	function measureTarget() {
		if (!trackEl) return;
		const sceneEl = trackEl.closest('[data-scene]') as HTMLElement;
		if (!sceneEl) return;
		const sceneRect = sceneEl.getBoundingClientRect();
		const trackRect = trackEl.getBoundingClientRect();

		const rocketAbsX = trackRect.left + rocketPixelX + rocketOffset;
		const rocketAbsY = trackRect.top + trackRect.height / 2;

		if (rocket.isFirstToComplete) {
			animType = 'winner';
			const targetX = sceneRect.left + sceneRect.width / 2;
			const targetY = sceneRect.bottom - 50;
			const dx = targetX - rocketAbsX;
			const dy = targetY - rocketAbsY;
			swoopPath = {
				c1x: 250, c1y: -100,    // depart: continue right + arc upward
				c2x: dx, c2y: -200,     // approach: directly above target (vertical landing)
				dx, dy
			};
		} else {
			animType = 'loser';
			swoopPath = {
				c1x: 150, c1y: -120,
				c2x: 350, c2y: -350,
				dx: 400, dy: -500
			};
		}
	}

	function startCompletionAnim() {
		if (isAnimating) return;
		isAnimating = true;
		measureTarget();

		if (animType === 'winner') {
			animProgress.set(1, { duration: 4000, easing: sineInOut });
		} else {
			animProgress.set(1, { duration: 2500, easing: cubicIn });
		}
	}

	function resetCompletionAnim() {
		isAnimating = false;
		animType = null;
		swoopPath = null;
		animProgress.set(0, { duration: 0 });
	}

	$effect(() => {
		if (rocket.state === 'completed') {
			startCompletionAnim();
		} else if (rocket.state === 'idle') {
			resetCompletionAnim();
		}
	});

	const animX = $derived.by(() => {
		if ($animProgress === 0 || !swoopPath) return 0;
		return cubicBezierVal($animProgress, 0, swoopPath.c1x, swoopPath.c2x, swoopPath.dx);
	});

	const animY = $derived.by(() => {
		if ($animProgress === 0 || !swoopPath) return 0;
		return cubicBezierVal($animProgress, 0, swoopPath.c1y, swoopPath.c2y, swoopPath.dy);
	});

	const animRotation = $derived.by(() => {
		if ($animProgress === 0 || !swoopPath) return 0;
		const t = Math.max(0.001, $animProgress);
		const tdx = cubicBezierDeriv(t, 0, swoopPath.c1x, swoopPath.c2x, swoopPath.dx);
		const tdy = cubicBezierDeriv(t, 0, swoopPath.c1y, swoopPath.c2y, swoopPath.dy);
		const tangentAngle = Math.atan2(tdy, tdx) * 180 / Math.PI;

		if (animType === 'winner') {
			// Flip-and-burn: follow path nose-forward, then flip 180° to land nose-up
			const flipStart = 0.25;
			const flipEnd = 0.65;
			if (t <= flipStart) return tangentAngle;
			if (t >= flipEnd) return tangentAngle + 180;
			// Smoothstep blend during the flip
			const ft = (t - flipStart) / (flipEnd - flipStart);
			const smooth = ft * ft * (3 - 2 * ft);
			return tangentAngle + 180 * smooth;
		}

		return tangentAngle;
	});

	const animScale = $derived(
		animType === 'winner' ? 1 - 0.15 * $animProgress : 1 - 0.4 * $animProgress
	);

	const animOpacity = $derived(
		animType === 'loser' ? Math.max(0, 1 - $animProgress * 1.3) : 1
	);

	// Context menu state
	let menuOpen = $state(false);
	let menuX = $state(0);
	let menuY = $state(0);
	let infoOpen = $state(false);

	const MENU_WIDTH = 140;
	const MENU_HEIGHT = 110;

	function handleLaneClick(e: MouseEvent) {
		const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
		let x = e.clientX - rect.left;
		let y = e.clientY - rect.top;
		// Clamp so the menu stays within the lane bounds
		if (x + MENU_WIDTH > rect.width) x = rect.width - MENU_WIDTH;
		if (y + MENU_HEIGHT > rect.height) y = y - MENU_HEIGHT;
		if (x < 0) x = 0;
		if (y < 0) y = 0;
		menuX = x;
		menuY = y;
		menuOpen = true;
	}

	function handleViewInternals() {
		menuOpen = false;
		selectRocket(rocket.id);
	}

	function handleViewCode() {
		menuOpen = false;
		selectRocketCode(rocket.id);
	}

	function handleViewInfo() {
		menuOpen = false;
		infoOpen = !infoOpen;
	}

	// Close menu/info on outside click
	$effect(() => {
		if (menuOpen) {
			const handler = () => { menuOpen = false; };
			// Delay to avoid the opening click closing it immediately
			const timer = setTimeout(() => {
				window.addEventListener('click', handler, { once: true });
			}, 0);
			return () => {
				clearTimeout(timer);
				window.removeEventListener('click', handler);
			};
		}
	});

	$effect(() => {
		if (infoOpen) {
			const handler = () => { infoOpen = false; };
			const timer = setTimeout(() => {
				window.addEventListener('click', handler, { once: true });
			}, 0);
			return () => {
				clearTimeout(timer);
				window.removeEventListener('click', handler);
			};
		}
	});
</script>

<div
	class="relative flex flex-col md:flex-row md:items-center md:h-14 w-full cursor-pointer hover:bg-white/[0.02] transition-colors rounded"
	style="{isAnimating ? 'z-index: 50;' : ''}"
	onclick={handleLaneClick}
	role="button"
	tabindex="0"
	onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleLaneClick(e as unknown as MouseEvent); }}
>
	<!-- Status label (above track on mobile, left side on desktop) -->
	<div class="shrink-0 w-full md:w-[150px] pl-1 md:pl-0 md:pr-3 mb-6 md:mb-0">
		<RocketStatus
			strategyType={rocket.id}
			state={rocket.state}
			completedCalls={rocket.completedCalls}
			totalCalls={rocket.totalCalls}
		/>
	</div>

	<!-- Track area -->
	<div class="relative flex-1 w-full h-10 md:h-full flex items-center overflow-visible" bind:this={trackEl}>
		<!-- Track line -->
		<div
			class="absolute left-0 right-4 md:right-8 top-1/2 transition-all duration-1000"
			style="
				height: {cascadeActive ? '2px' : '1px'};
				background: {cascadeActive ? '#ffd60a60' : config.color + '20'};
				{cascadeActive ? 'box-shadow: 0 0 8px #ffd60a40;' : ''}
			"
		></div>

		<!-- Stage markers + cluster dots -->
		{#each stageBoundaries() as stage, stageIdx}
			<!-- Stage boundary line -->
			<div
				class="absolute top-1 bottom-1 w-px"
				style="left: {stage.start * 100}%; background: #ffffff10;"
			></div>

			<!-- Stage name (on hover area) -->
			<div
				class="absolute top-0 font-mono text-[8px] text-text-muted opacity-0 hover:opacity-100 transition-opacity"
				style="left: {(stage.start + (stage.end - stage.start) / 2) * 100}%; transform: translateX(-50%);"
			>
				{stage.name}
			</div>

			<!-- Cluster dots for this stage's groups -->
			{#each { length: stage.groups } as _, groupIdx}
				{@const groupProgress = (groupIdx + 0.5) / stage.groups}
				{@const dotLeft = (stage.start + (stage.end - stage.start) * groupProgress) * 100}
				{@const status = getGroupStatus(stageIdx, groupIdx)}
				{@const flatIdx = dotFlatIndex().indices[stageIdx]?.[groupIdx] ?? 0}
				{@const sweepDelay = flatIdx * 60}
				{@const stageJustCompleted = animatingStages.has(stageIdx)}
				{@const stageSweepDelay = groupIdx * 50}
				{@const groupResult = rocket.stageResults[stageIdx]?.[groupIdx]}
				<!-- Wrapper handles centering; inner dot handles visuals + animation -->
				<div
					class="absolute group/dot"
					style="left: {dotLeft}%; top: 50%; transform: translateX(-50%) translateY(-50%);"
				>
					<div
						class="rounded-full border transition-all duration-200 dot-size {cascadeActive ? 'cascade-dot' : ''} {stageJustCompleted && !cascadeActive ? 'stage-complete-dot' : ''}"
						style="
							background: {cascadeActive ? '#ffd60a50' : status === 'pending' ? 'transparent' : clusterColor(status) + '30'};
							border-color: {cascadeActive ? '#ffd60a' : clusterColor(status)};
							{cascadeActive ? `box-shadow: 0 0 8px #ffd60a80, 0 0 16px #ffd60a40; animation-delay: ${sweepDelay}ms;` : ''}
							{stageJustCompleted && !cascadeActive ? `animation-delay: ${stageSweepDelay}ms;` : ''}
							{!cascadeActive && !stageJustCompleted && status === 'in-progress' ? 'box-shadow: 0 0 6px ' + clusterColor(status) + '80; animation: pulse 1.5s ease-in-out infinite;' : ''}
						"
					></div>
					<!-- Custom tooltip -->
					<div
						class="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 pointer-events-none
						       opacity-0 group-hover/dot:opacity-100 transition-opacity duration-150
						       whitespace-nowrap px-2 py-1 rounded border font-mono"
						style="font-size: 10px; background: #1a1e2e; border-color: #ffffff20; color: #94a3b8; box-shadow: 0 2px 10px rgba(0,0,0,0.6);"
					>
						<span style="color: #e2e8f0;">{groupResult?.groupName ?? ''}</span>
						<span style="color: #64748b;"> · </span>
						<span style="color: {clusterColor(status)};">{groupResult?.completedCalls ?? 0}/{groupResult?.totalCalls ?? 0}</span>
						<span style="color: #64748b;"> calls</span>
					</div>
				</div>
			{/each}
		{/each}

		<!-- Finish marker -->
		<div
			class="absolute right-0 top-1/2 -translate-y-1/2 font-mono text-xs transition-all duration-500"
			style="color: {rocket.isFirstToComplete ? '#06d6a0' : '#06d6a040'}; {rocket.isFirstToComplete ? 'filter: drop-shadow(0 0 6px #06d6a080); transform: translateY(-50%) scale(1.3);' : ''}"
		>
			🏁
		</div>

		<!-- Exhaust particle trail -->
		<ExhaustTrail
			strategyType={rocket.id}
			rocketState={rocket.state}
			nozzleX={nozzleX}
			nozzleY={nozzleY}
		/>

		<!-- Explosion effect -->
		{#if showExplosion}
			<Explosion
				strategyType={rocket.id}
				x={rocketPixelX + rocketOffset}
				y={nozzleY}
			/>
		{/if}

		<!-- Success celebration -->
		{#if showSuccess}
			<SuccessEffect
				strategyType={rocket.id}
				x={rocketPixelX + rocketOffset}
				y={nozzleY}
			/>
		{/if}

		<!-- Repair ship (EDA manual intervention) -->
		{#if showRepairShip}
			<RepairShip
				phase={repairPhase}
				progress={rocket.repairShipProgress}
				targetX={rocketPixelX}
				targetY={nozzleY}
			/>
		{/if}

		<!-- Stalled indicator -->
		{#if isStalled}
			<div
				class="absolute z-30 font-mono text-[9px] px-1.5 py-0.5 rounded whitespace-nowrap animate-pulse"
				style="left: {rocketPixelX + rocketWidth + 4}px; top: {nozzleY - 20}px; background: #e6394625; color: #e63946;"
			>
				⚠ <span class="hidden md:inline">Error Queue — Awaiting Manual Intervention...</span><span class="md:hidden">Error Queue</span>
			</div>
		{/if}

		<!-- Rocket (positioned along track) -->
		<div
			class="absolute z-20"
			style="
				left: {rocketPixelX}px;
				top: 50%;
				transform: translateY(-50%) translate({animX}px, {animY}px) rotate({animRotation}deg) scale({animScale * rocketScale});
				opacity: {animOpacity};
				transform-origin: center center;
				transition: none;
				will-change: transform;
			"
		>
			<Rocket
				strategyType={rocket.id}
				state={rocket.state}
				retryCount={rocket.retryCount}
				maxRetries={rocket.maxRetries}
				backoffRemaining={rocket.backoffTimerRemaining}
				errorQueueCount={rocket.errorQueueMessages.length}
				immediateRetriesRemaining={rocket.immediateRetriesRemaining}
				delayedRetriesRemaining={rocket.delayedRetriesRemaining}
			/>
		</div>
	</div>

	<!-- Context Menu -->
	{#if menuOpen}
		<!-- svelte-ignore a11y_interactive_supports_focus -->
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<div
			class="absolute z-50 rounded-lg overflow-hidden shadow-xl context-menu-appear"
			style="
				left: {menuX}px;
				top: {menuY}px;
				background: #1a1e2e;
				border: 1px solid {config.color}30;
				box-shadow: 0 4px 24px rgba(0,0,0,0.5), 0 0 12px {config.color}15;
			"
			onclick={(e) => e.stopPropagation()}
			role="menu"
		>
			<button
				class="flex items-center gap-2 w-full px-4 py-2.5 font-mono text-[12px] text-left transition-colors hover:bg-white/[0.06]"
				style="color: {config.color};"
				onclick={handleViewCode}
				role="menuitem"
			>
				<span class="text-sm opacity-70">&#x2630;</span>
				<span>Code</span>
			</button>
			<div style="height: 1px; background: {config.color}15;"></div>
			<button
				class="flex items-center gap-2 w-full px-4 py-2.5 font-mono text-[12px] text-left transition-colors hover:bg-white/[0.06]"
				style="color: {config.color};"
				onclick={handleViewInternals}
				role="menuitem"
			>
				<span class="text-sm opacity-70">&#x2699;</span>
				<span>Internals</span>
			</button>
		<div class="md:hidden" style="height: 1px; background: {config.color}15;"></div>
		<button
			class="md:hidden flex items-center gap-2 w-full px-4 py-2.5 font-mono text-[12px] text-left transition-colors hover:bg-white/[0.06]"
			style="color: {config.color};"
			onclick={handleViewInfo}
			role="menuitem"
		>
			<span class="text-sm opacity-70">&#x24D8;</span>
			<span>Info</span>
		</button>
		</div>
	{/if}

	<!-- Info panel -->
	{#if infoOpen}
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
		<div
			class="md:hidden absolute left-1 right-1 z-50 p-3 rounded-lg border font-mono {rocket.id === 'eda' ? 'bottom-full mb-1' : 'top-full mt-1'}"
			onclick={(e) => e.stopPropagation()}
			role="region"
			style="
				background: #1a1e2e;
				border-color: {config.color}30;
				box-shadow: 0 4px 20px rgba(0,0,0,0.4), 0 0 10px {config.color}10;
			"
		>
			<div class="flex items-start justify-between gap-2 mb-1.5">
				<span class="text-[11px] font-semibold" style="color: {config.color};">{config.label}</span>
				<button
					class="text-[10px] opacity-40 hover:opacity-80 transition-opacity leading-none"
					style="color: {config.color};"
					onclick={(e) => { e.stopPropagation(); infoOpen = false; }}
					aria-label="Close"
				>✕</button>
			</div>
			<p class="text-[10px] leading-relaxed mb-1.5" style="color: #94a3b8;">{config.description}</p>
			<p class="text-[10px]" style="color: {config.color};">Good for: <span style="color: #64748b;">{config.goodFor}</span></p>
		</div>
	{/if}
</div>

<style>
	.dot-size {
		width: 0.4rem;
		height: 0.4rem;
	}

	@media (min-width: 768px) {
		.dot-size {
			width: 0.625rem;
			height: 0.625rem;
		}
	}

	.cascade-dot.dot-size {
		width: 0.5rem;
		height: 0.5rem;
	}

	@media (min-width: 768px) {
		.cascade-dot.dot-size {
			width: 0.875rem;
			height: 0.875rem;
		}
	}

	.context-menu-appear {
		animation: menu-pop 0.15s ease-out;
	}

	@keyframes menu-pop {
		from { opacity: 0; transform: scale(0.9); }
		to { opacity: 1; transform: scale(1); }
	}

	.cascade-dot {
		animation: cascade-flash 0.8s ease-out both;
	}

	.stage-complete-dot {
		animation: stage-complete-ripple 0.6s ease-out both;
	}

	@keyframes stage-complete-ripple {
		0% {
			transform: scale(1);
		}
		30% {
			transform: scale(1.6);
			background: #06d6a060 !important;
			border-color: #06d6a0 !important;
			box-shadow: 0 0 8px #06d6a070, 0 0 14px #06d6a030;
		}
		100% {
			transform: scale(1);
			background: #06d6a030 !important;
			border-color: #06d6a0 !important;
			box-shadow: none;
		}
	}

	@keyframes cascade-flash {
		0% {
			transform: scale(1);
			box-shadow: 0 0 4px #ffd60a40;
		}
		20% {
			transform: scale(2.2);
			background: #ffffffcc !important;
			border-color: #ffffff !important;
			box-shadow: 0 0 16px #ffd60aee, 0 0 30px #ffd60a80, 0 0 50px #ffd60a40;
		}
		50% {
			transform: scale(1.5);
			background: #ffd60a80 !important;
			border-color: #ffd60a !important;
			box-shadow: 0 0 10px #ffd60aaa, 0 0 20px #ffd60a50;
		}
		100% {
			transform: scale(1.3);
			background: #ffd60a50 !important;
			border-color: #ffd60a !important;
			box-shadow: 0 0 8px #ffd60a80, 0 0 16px #ffd60a40;
		}
	}
</style>
