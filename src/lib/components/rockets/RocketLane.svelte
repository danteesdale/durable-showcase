<script lang="ts">
	import { tweened } from 'svelte/motion';
	import { cubicOut } from 'svelte/easing';
	import Rocket from './Rocket.svelte';
	import RocketStatus from './RocketStatus.svelte';
	import ExhaustTrail from './ExhaustTrail.svelte';
	import Explosion from './Explosion.svelte';
	import SuccessEffect from './SuccessEffect.svelte';
	import RepairShip from './RepairShip.svelte';
	import type { RocketSimulation } from '$lib/simulation/types';
	import { ROCKET_CONFIG } from '$lib/constants';
	import { MISSION } from '$lib/simulation/missionStages';

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

	// Compute nozzle position (left edge of rocket SVG = nozzle area)
	const rocketPixelX = $derived($position * (trackWidth - 32)); // subtract right margin
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

	// Track effect states
	const showExplosion = $derived(rocket.state === 'failed');
	const showSuccess = $derived(rocket.state === 'completed');
	const repairPhase = $derived(
		rocket.state === 'repair-approaching' ? 'approaching' as const
		: rocket.state === 'repair-docked' ? 'docked' as const
		: rocket.state === 'repair-departing' ? 'departing' as const
		: 'gone' as const
	);
	const showRepairShip = $derived(repairPhase !== 'gone');
	const isStalled = $derived(rocket.state === 'error-queue-stalled');
</script>

<div class="relative flex items-center h-14 w-full">
	<!-- Status label (left side) -->
	<div class="shrink-0 w-[190px] pr-3">
		<RocketStatus
			strategyType={rocket.id}
			state={rocket.state}
			completedCalls={rocket.completedCalls}
			totalCalls={rocket.totalCalls}
		/>
	</div>

	<!-- Track area -->
	<div class="relative flex-1 h-full flex items-center" bind:this={trackEl}>
		<!-- Track line -->
		<div class="absolute left-0 right-8 h-px top-1/2" style="background: {config.color}20;"></div>

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
				<div
					class="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full border transition-all duration-200"
					style="
						left: {dotLeft}%;
						transform: translateX(-50%) translateY(-50%);
						background: {status === 'pending' ? 'transparent' : clusterColor(status)}30;
						border-color: {clusterColor(status)};
						{status === 'in-progress' ? 'box-shadow: 0 0 6px ' + clusterColor(status) + '80; animation: pulse 1.5s ease-in-out infinite;' : ''}
					"
					title="{rocket.stageResults[stageIdx]?.[groupIdx]?.groupName ?? ''}: {rocket.stageResults[stageIdx]?.[groupIdx]?.completedCalls ?? 0}/{rocket.stageResults[stageIdx]?.[groupIdx]?.totalCalls ?? 0} calls"
				></div>
			{/each}
		{/each}

		<!-- Finish marker -->
		<div
			class="absolute right-0 top-1/2 -translate-y-1/2 font-mono text-xs"
			style="color: #06d6a040;"
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
				x={rocketPixelX + 33}
				y={nozzleY}
			/>
		{/if}

		<!-- Success celebration -->
		{#if showSuccess}
			<SuccessEffect
				strategyType={rocket.id}
				x={rocketPixelX + 33}
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
				style="left: {rocketPixelX + 70}px; top: {nozzleY - 20}px; background: #e6394625; color: #e63946;"
			>
				⚠ Error Queue — Awaiting Manual Intervention...
			</div>
		{/if}

		<!-- Rocket (positioned along track) -->
		<div
			class="absolute top-1/2 -translate-y-1/2 z-20"
			style="left: calc({$position * 100}% - 30px); transition: none;"
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
</div>
