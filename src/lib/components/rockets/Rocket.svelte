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

	const shieldVisible = $derived(state === 'paused');
	const isExploded = $derived(state === 'failed');
</script>

<div
	class="relative flex items-center"
	class:rocket-retry={isRetrying}
	style="transform: translateY({$hoverY}px);"
>
	{#if !isExploded}
		<!-- Rocket SVG — pointed nose, tapered body, swept fins, engine bell -->
		<svg
			viewBox="0 0 66 36"
			width="66"
			height="36"
			class="relative z-10 transition-opacity duration-300"
			style="opacity: {state === 'paused' ? 0.7 : 1}; filter: {state === 'error-queue-stalled' ? 'saturate(0.5)' : 'none'};"
		>
			<defs>
				<linearGradient id="hull-{strategyType}" x1="0" y1="0" x2="0" y2="1">
					<stop offset="0%" stop-color="{config.color}" stop-opacity="0.95" />
					<stop offset="50%" stop-color="{config.color}" stop-opacity="0.75" />
					<stop offset="100%" stop-color="{config.color}" stop-opacity="0.5" />
				</linearGradient>
				<linearGradient id="nose-{strategyType}" x1="0" y1="0" x2="1" y2="0">
					<stop offset="0%" stop-color="{config.color}" stop-opacity="0.9" />
					<stop offset="100%" stop-color="white" stop-opacity="0.3" />
				</linearGradient>
				<radialGradient id="window-{strategyType}" cx="0.4" cy="0.35" r="0.6">
					<stop offset="0%" stop-color="{config.color}" stop-opacity="0.5" />
					<stop offset="60%" stop-color="#0a0e1a" stop-opacity="0.9" />
					<stop offset="100%" stop-color="#0a0e1a" stop-opacity="1" />
				</radialGradient>
				<linearGradient id="exhaust-{strategyType}" x1="1" y1="0" x2="0" y2="0">
					<stop offset="0%" stop-color="{config.color}" stop-opacity="0.8" />
					<stop offset="40%" stop-color="#f48c06" stop-opacity="0.6" />
					<stop offset="100%" stop-color="#ff4400" stop-opacity="0" />
				</linearGradient>
				<filter id="glow-{strategyType}">
					<feGaussianBlur stdDeviation="2" result="blur" />
					<feComposite in="SourceGraphic" in2="blur" operator="over" />
				</filter>
			</defs>

			<!-- Exhaust flame -->
			<ellipse
				cx="5"
				cy="18"
				rx="8"
				ry="4"
				fill="url(#exhaust-{strategyType})"
				opacity={exhaustOpacity}
				filter="url(#glow-{strategyType})"
			>
				{#if state === 'in-progress'}
					<animate attributeName="rx" values="6;10;6" dur="0.15s" repeatCount="indefinite" />
					<animate attributeName="ry" values="3;5;3" dur="0.2s" repeatCount="indefinite" />
					<animate attributeName="opacity" values="0.7;1;0.7" dur="0.12s" repeatCount="indefinite" />
				{/if}
			</ellipse>

			<!-- Engine bell / nozzle -->
			<path d="M10,12 L14,14 L14,22 L10,24 Z" fill="#666" stroke="#888" stroke-width="0.4" />
			<path d="M10,13 L12,14.5 L12,21.5 L10,23 Z" fill="#444" />

			<!-- Bottom fin (behind body) -->
			<path d="M14,24 L10,32 L22,24 Z" fill="{config.color}" opacity="0.6" stroke="{config.color}" stroke-width="0.3" stroke-opacity="0.4" />

			<!-- Top fin (behind body) -->
			<path d="M14,12 L10,4 L22,12 Z" fill="{config.color}" opacity="0.6" stroke="{config.color}" stroke-width="0.3" stroke-opacity="0.4" />

			<!-- Main fuselage — tapered cylinder -->
			<path
				d="M14,12 L50,12.5 Q54,13 55,15 L55,21 Q54,23 50,23.5 L14,24 Z"
				fill="url(#hull-{strategyType})"
				stroke="{config.color}"
				stroke-width="0.4"
				stroke-opacity="0.5"
			/>

			<!-- Body highlight / reflection stripe -->
			<path
				d="M16,14 L48,14.5 Q52,15 52,15.5 L52,16 Q52,16 48,15.5 L16,15 Z"
				fill="white"
				opacity="0.12"
			/>

			<!-- Nose cone — rounded bullet shape -->
			<path
				d="M50,12.5 Q58,13 62,18 Q58,23 50,23.5 Q54,23 55,21 L55,15 Q54,13 50,12.5 Z"
				fill="url(#nose-{strategyType})"
				stroke="{config.color}"
				stroke-width="0.3"
				stroke-opacity="0.4"
			/>

			<!-- Nose tip highlight -->
			<path
				d="M55,15.5 Q58,16.5 59,18 Q57,17 55,16.5 Z"
				fill="white"
				opacity="0.2"
			/>

			<!-- Window / porthole -->
			<circle cx="43" cy="18" r="3" fill="url(#window-{strategyType})" stroke="{config.color}" stroke-width="0.6" opacity="0.9" />
			<circle cx="42.2" cy="17.2" r="1" fill="{config.color}" opacity="0.25" />

			<!-- Fuselage detail rings -->
			<line x1="26" y1="13.5" x2="26" y2="22.5" stroke="{config.color}" stroke-width="0.3" opacity="0.3" />
			<line x1="36" y1="13.2" x2="36" y2="22.8" stroke="{config.color}" stroke-width="0.3" opacity="0.3" />

			<!-- Small stabilizer fins near engine -->
			<path d="M16,12.5 L13,8 L20,12.5 Z" fill="{config.color}" opacity="0.45" />
			<path d="M16,23.5 L13,28 L20,23.5 Z" fill="{config.color}" opacity="0.45" />
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
						width: 90px;
						height: 52px;
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
		<div class="relative w-[66px] h-[36px] flex items-center justify-center">
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
