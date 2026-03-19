<script lang="ts">
	import { spring } from 'svelte/motion';
	import type { RocketState, StrategyType } from '$lib/simulation/types';
	import { ROCKET_CONFIG } from '$lib/constants';

	interface Props {
		strategyType: StrategyType;
		state?: RocketState;
		retryCount?: number;
		maxRetries?: number | null;
		backoffRemaining?: number;
		errorQueueCount?: number;
		immediateRetriesRemaining?: number;
		delayedRetriesRemaining?: number;
	}

	let {
		strategyType,
		state = 'idle',
		retryCount = 0,
		maxRetries = null,
		backoffRemaining = 0,
		errorQueueCount = 0,
		immediateRetriesRemaining = 0,
		delayedRetriesRemaining = 0
	}: Props = $props();

	const config = $derived(ROCKET_CONFIG[strategyType]);

	// Hover animation for idle state
	const hoverY = spring(0, { stiffness: 0.05, damping: 0.3 });

	let hoverInterval: ReturnType<typeof setInterval>;

	$effect(() => {
		if (state === 'idle') {
			let t = 0;
			hoverInterval = setInterval(() => {
				t += 0.05;
				hoverY.set(Math.sin(t) * 3);
			}, 50);
		} else {
			clearInterval(hoverInterval);
			hoverY.set(0);
		}

		return () => clearInterval(hoverInterval);
	});

	const isRetrying = $derived(state === 'retrying');

	const exhaustOpacity = $derived(
		state === 'in-progress' || state === 'repair-departing'
			? 0.9
			: state === 'error-queue-stalled' || state === 'repair-approaching' || state === 'repair-docked'
				? 0.3
				: state === 'idle'
					? 0.15
					: 0
	);

	const shieldVisible = $derived(state === 'retrying' && strategyType === 'temporal');
	const isExploded = $derived(state === 'failed');
</script>

<div
	class="relative flex items-center"
	class:rocket-retry={isRetrying}
	style="transform: translateY({$hoverY}px);"
>
	{#if !isExploded}
		<svg
			viewBox="0 0 82 40"
			width="82"
			height="40"
			class="relative z-10 transition-opacity duration-300"
			style="opacity: {state === 'paused' ? 0.7 : 1}; filter: {state === 'error-queue-stalled' ? 'saturate(0.5)' : 'none'};"
		>
			<defs>
				<!-- Metallic hull gradient (top-lit) -->
				<linearGradient id="hull-{strategyType}" x1="0" y1="0" x2="0" y2="1">
					<stop offset="0%" stop-color="#e8e8ee" />
					<stop offset="20%" stop-color="#c8c8d0" />
					<stop offset="55%" stop-color="#888894" />
					<stop offset="85%" stop-color="#585864" />
					<stop offset="100%" stop-color="#686874" />
				</linearGradient>

				<!-- Nose metallic -->
				<linearGradient id="nose-{strategyType}" x1="0" y1="0" x2="0" y2="1">
					<stop offset="0%" stop-color="#d8d8e0" />
					<stop offset="50%" stop-color="#9898a4" />
					<stop offset="100%" stop-color="#686874" />
				</linearGradient>

				<!-- Engine interior heat -->
				<radialGradient id="engine-{strategyType}" cx="80%" cy="50%" r="70%">
					<stop offset="0%" stop-color="#ffaa55" />
					<stop offset="50%" stop-color="#cc4400" />
					<stop offset="100%" stop-color="#331100" />
				</radialGradient>

				<!-- Exhaust core (white-hot center) -->
				<radialGradient id="exhaust-core-{strategyType}" cx="85%" cy="50%" r="60%">
					<stop offset="0%" stop-color="white" stop-opacity="0.95" />
					<stop offset="40%" stop-color="#bbddff" stop-opacity="0.7" />
					<stop offset="100%" stop-color="{config.color}" stop-opacity="0" />
				</radialGradient>

				<!-- Exhaust outer (orange plume) -->
				<linearGradient id="exhaust-outer-{strategyType}" x1="1" y1="0" x2="0" y2="0">
					<stop offset="0%" stop-color="{config.color}" stop-opacity="0.5" />
					<stop offset="40%" stop-color="#f48c06" stop-opacity="0.35" />
					<stop offset="100%" stop-color="#ff4400" stop-opacity="0" />
				</linearGradient>

				<!-- Window glass -->
				<radialGradient id="window-{strategyType}" cx="0.35" cy="0.3" r="0.6">
					<stop offset="0%" stop-color="#aaddff" stop-opacity="0.5" />
					<stop offset="50%" stop-color="#1a2a4a" />
					<stop offset="100%" stop-color="#0a0e1a" />
				</radialGradient>

				<!-- Glow filter for exhaust -->
				<filter id="glow-{strategyType}">
					<feGaussianBlur stdDeviation="2" result="blur" />
					<feComposite in="SourceGraphic" in2="blur" operator="over" />
				</filter>
			</defs>

			<!-- === EXHAUST (behind everything) === -->
			<!-- Outer plume -->
			<ellipse
				cx="5" cy="20" rx="12" ry="4.5"
				fill="url(#exhaust-outer-{strategyType})"
				opacity={exhaustOpacity}
				filter="url(#glow-{strategyType})"
			>
				{#if state === 'in-progress'}
					<animate attributeName="rx" values="10;14;10" dur="0.15s" repeatCount="indefinite" />
					<animate attributeName="ry" values="3.5;5.5;3.5" dur="0.2s" repeatCount="indefinite" />
				{/if}
			</ellipse>
			<!-- Hot core -->
			<ellipse
				cx="9" cy="20" rx="5" ry="2"
				fill="url(#exhaust-core-{strategyType})"
				opacity={exhaustOpacity}
			>
				{#if state === 'in-progress'}
					<animate attributeName="rx" values="4;6;4" dur="0.12s" repeatCount="indefinite" />
					<animate attributeName="ry" values="1.5;2.5;1.5" dur="0.15s" repeatCount="indefinite" />
					<animate attributeName="opacity" values="0.7;1;0.7" dur="0.1s" repeatCount="indefinite" />
				{/if}
			</ellipse>

			<!-- === ENGINE BELL === -->
			<path d="M10,15.5 L15,16.5 L15,23.5 L10,24.5 Z" fill="#5a5a64" stroke="#7a7a84" stroke-width="0.4" />
			<path d="M10,16.5 L13,17 L13,23 L10,23.5 Z" fill="url(#engine-{strategyType})" />

			<!-- === FINS (behind body) === -->
			<!-- Bottom main fin -->
			<path d="M15,24 L10,33 L26,24 Z" fill="{config.color}" opacity="0.7" stroke="{config.color}" stroke-width="0.3" stroke-opacity="0.4" />
			<!-- Top main fin -->
			<path d="M15,16 L10,7 L26,16 Z" fill="{config.color}" opacity="0.7" stroke="{config.color}" stroke-width="0.3" stroke-opacity="0.4" />
			<!-- Small stabilizers -->
			<path d="M18,16 L14,11 L24,16 Z" fill="{config.color}" opacity="0.45" />
			<path d="M18,24 L14,29 L24,24 Z" fill="{config.color}" opacity="0.45" />

			<!-- === FUSELAGE (slimmer body: y=16 to y=24) === -->
			<path
				d="M15,16 L58,16.3 Q62,16.5 63,17.5 L63,22.5 Q62,23.5 58,23.7 L15,24 Z"
				fill="url(#hull-{strategyType})"
				stroke="#9a9aa4"
				stroke-width="0.3"
			/>

			<!-- Strategy color accent stripe -->
			<path
				d="M19,19.2 L58,19.4 Q61,19.5 62,19.8 L62,20.8 Q61,21.1 58,21.2 L19,21.4 Z"
				fill="{config.color}"
				opacity="0.55"
			/>

			<!-- Specular highlight (top) -->
			<path
				d="M19,16.8 L56,17.1 Q60,17.2 61,17.5 L61,18 Q60,17.8 56,17.5 L19,17.2 Z"
				fill="white"
				opacity="0.22"
			/>

			<!-- Panel lines -->
			<line x1="30" y1="16.8" x2="30" y2="23.2" stroke="#8888a0" stroke-width="0.3" opacity="0.2" />
			<line x1="42" y1="16.6" x2="42" y2="23.4" stroke="#8888a0" stroke-width="0.3" opacity="0.2" />

			<!-- === NOSE CONE (sharper, longer) === -->
			<path
				d="M58,16.3 Q68,17 76,20 Q68,23 58,23.7 Q62,23.5 63,22.5 L63,17.5 Q62,16.5 58,16.3 Z"
				fill="url(#nose-{strategyType})"
				stroke="#9a9aa4"
				stroke-width="0.3"
			/>

			<!-- Nose tip strategy color accent -->
			<path
				d="M71,18.5 Q74,19.5 76,20 Q74,20.5 71,21.5 Q73.5,20.5 73.5,20 Q73.5,19.5 71,18.5 Z"
				fill="{config.color}"
				opacity="0.6"
			/>

			<!-- Nose specular highlight -->
			<path d="M63,17.5 Q67,18.5 70,20 Q66.5,19 63,18.5 Z" fill="white" opacity="0.2" />

			<!-- === PORTHOLES (row of small windows) === -->
			<circle cx="48" cy="20" r="1.8" fill="url(#window-{strategyType})" stroke="#8888a0" stroke-width="0.4" />
			<circle cx="53" cy="20" r="1.8" fill="url(#window-{strategyType})" stroke="#8888a0" stroke-width="0.4" />
			<circle cx="58" cy="20" r="1.5" fill="url(#window-{strategyType})" stroke="#8888a0" stroke-width="0.4" />
			<!-- Glass reflections -->
			<circle cx="47.5" cy="19.5" r="0.6" fill="white" opacity="0.15" />
			<circle cx="52.5" cy="19.5" r="0.6" fill="white" opacity="0.15" />
		</svg>

		<!-- Shield effect (Temporal paused state) -->
		{#if shieldVisible}
			<div
				class="absolute inset-0 z-20 flex items-center justify-center pointer-events-none"
				style="margin: -8px -12px;"
			>
				<div
					class="rounded-full border-2 animate-pulse"
					style="
						width: 106px;
						height: 56px;
						border-color: {config.color}80;
						box-shadow: 0 0 20px {config.color}40, inset 0 0 15px {config.color}20;
					"
				></div>
			</div>
			<!-- Retry counter + timer -->
			<div
				class="absolute -top-6 left-1/2 -translate-x-1/2 z-30 font-mono text-[10px] whitespace-nowrap px-1.5 py-0.5 rounded flex items-center gap-1.5"
				style="background: {config.color}30; color: {config.color};"
			>
				<span class="font-bold">Retry {retryCount}/∞</span>
				<span class="opacity-70">{(backoffRemaining / 1000).toFixed(1)}s</span>
			</div>
		{/if}

		<!-- Retry counter (Polly) -->
		{#if state === 'retrying' && strategyType === 'polly'}
			<div
				class="absolute -top-6 left-1/2 -translate-x-1/2 z-30 font-mono text-xs font-bold whitespace-nowrap px-1.5 py-0.5 rounded"
				style="background: {config.color}30; color: {config.color};"
			>
				Retry {retryCount}/{maxRetries}
			</div>
		{/if}

		<!-- Retry counter (EDA — shows phase + attempt) -->
		{#if state === 'retrying' && strategyType === 'eda'}
			{@const totalAttempts = 8}
			{@const attemptsUsed = totalAttempts - immediateRetriesRemaining - delayedRetriesRemaining}
			{@const phase = immediateRetriesRemaining > 0 ? 'Immediate' : 'Delayed'}
			<div
				class="absolute -top-6 left-1/2 -translate-x-1/2 z-30 font-mono text-[10px] font-bold whitespace-nowrap px-1.5 py-0.5 rounded"
				style="background: {config.color}30; color: {config.color};"
			>
				{phase} Retry {attemptsUsed}/{totalAttempts}
			</div>
		{/if}

		<!-- Error queue badge (EDA) -->
		{#if state === 'error-queue-stalled' && errorQueueCount > 0}
			<div
				class="absolute -top-6 left-1/2 -translate-x-1/2 z-30 font-mono text-xs font-bold whitespace-nowrap px-1.5 py-0.5 rounded flex items-center gap-1"
				style="background: #e6394630; color: #e63946;"
			>
				<span>⚠</span>
				<span>Error Queue: {errorQueueCount}</span>
			</div>
		{/if}
	{:else}
		<!-- Explosion -->
		<div class="relative w-[82px] h-[40px] flex items-center justify-center">
			<div
				class="absolute w-16 h-16 rounded-full animate-ping"
				style="background: radial-gradient(circle, #ff440080, #ff000040, transparent); animation-duration: 1s; animation-iteration-count: 1;"
			></div>
			<span class="text-2xl relative z-10">💥</span>
		</div>
	{/if}
</div>

<style>
	.rocket-retry {
		animation: gentle-shake 0.6s ease-in-out;
	}

	@keyframes gentle-shake {
		0%, 100% { transform: translateX(0); }
		20% { transform: translateX(-2px); }
		40% { transform: translateX(2px); }
		60% { transform: translateX(-1px); }
		80% { transform: translateX(1px); }
	}
</style>
