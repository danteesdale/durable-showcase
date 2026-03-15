<script lang="ts">
	import {
		launch,
		reset,
		failureConfig,
		isRunning,
		updateFailureConfig,
		speedMultiplier
	} from '$lib/stores/simulation';
	import {
		controlMode,
		lastChaosAction,
		startChaosMonkey,
		stopChaosMonkey,
		setControlMode
	} from '$lib/stores/chaosMonkey';
	import { missionSuccessProbability } from '$lib/simulation/missionStages';
	import { SPEED_OPTIONS, DEFAULT_FAILURE_CONFIG } from '$lib/constants';

	const isChaos = $derived($controlMode === 'chaos');
	const controlsDisabled = $derived(isChaos && $isRunning);

	function handleAvailabilityChange(e: Event) {
		if (controlsDisabled) return;
		const value = parseInt((e.target as HTMLInputElement).value);
		updateFailureConfig({ serviceAvailability: value });
	}

	function handleNetworkChange(e: Event) {
		if (controlsDisabled) return;
		const value = parseInt((e.target as HTMLInputElement).value);
		updateFailureConfig({ networkFailureRate: value });
	}

	function toggleRateLimit() {
		if (controlsDisabled) return;
		updateFailureConfig({ rateLimitEnabled: !$failureConfig.rateLimitEnabled });
	}

	function toggleInfraDown() {
		if (controlsDisabled) return;
		updateFailureConfig({ infrastructureDown: !$failureConfig.infrastructureDown });
	}

	function setSpeed(s: number) {
		speedMultiplier.set(s);
	}

	function handleLaunch() {
		launch();
		if ($controlMode === 'chaos') {
			startChaosMonkey();
		}
	}

	function handleReset() {
		stopChaosMonkey();
		reset();
		// Reset failure config to defaults
		updateFailureConfig({ ...DEFAULT_FAILURE_CONFIG });
	}

	function toggleMode() {
		const newMode = isChaos ? 'manual' : 'chaos';
		setControlMode(newMode);
		if (newMode === 'manual') {
			// When switching to manual, reset failure config so user starts clean
			updateFailureConfig({ ...DEFAULT_FAILURE_CONFIG });
		}
	}

	const successProb = $derived(missionSuccessProbability($failureConfig.serviceAvailability));

	// Chaos action display fade
	let actionVisible = $state(false);
	let actionText = $state('');
	let fadeTimeout: ReturnType<typeof setTimeout>;

	$effect(() => {
		const action = $lastChaosAction;
		if (action) {
			actionText = action.message;
			actionVisible = true;
			clearTimeout(fadeTimeout);
			fadeTimeout = setTimeout(() => {
				actionVisible = false;
			}, 2500);
		}
	});
</script>

<div
	class="relative z-20 border-t backdrop-blur-xl px-6 py-4"
	style="background: var(--color-panel-bg); border-color: var(--color-panel-border);"
>
	<!-- Header -->
	<div class="flex items-center justify-between mb-3">
		<div class="flex items-center gap-3">
			<h2 class="font-display text-sm font-semibold text-text-secondary tracking-wider uppercase">
				Mission Control
			</h2>

			<!-- Mode Toggle -->
			<div class="flex items-center rounded-full border overflow-hidden" style="border-color: #ffffff15;">
				<button
					onclick={() => { if (!isChaos) toggleMode(); }}
					class="flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-mono font-bold transition-all"
					style="
						background: {isChaos ? '#f48c0620' : 'transparent'};
						color: {isChaos ? '#f48c06' : '#64748b'};
					"
				>
					<span class="text-sm" class:chaos-monkey-bounce={isChaos}>🐵</span>
					<span>Chaos Space Monkey</span>
				</button>
				<div class="w-px h-4" style="background: #ffffff15;"></div>
				<button
					onclick={() => { if (isChaos) toggleMode(); }}
					class="flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-mono font-bold transition-all"
					style="
						background: {!isChaos ? '#ffffff10' : 'transparent'};
						color: {!isChaos ? '#e2e8f0' : '#64748b'};
					"
				>
					<span>Manual</span>
				</button>
			</div>

			<!-- Chaos action ticker -->
			{#if isChaos && actionVisible}
				<div
					class="font-mono text-[10px] px-2 py-0.5 rounded chaos-action-flash"
					style="background: #f48c0615; color: #f48c06;"
				>
					🐵 {actionText}
				</div>
			{/if}
		</div>

		<div class="font-mono text-[10px] text-text-muted">
			{#if $failureConfig.serviceAvailability < 100}
				Mission success (no retries): <span class="text-warning font-bold">{successProb.toFixed(1)}%</span>
			{/if}
		</div>
	</div>

	<div class="flex items-end gap-6 flex-wrap">
		<!-- Service Availability -->
		<div class="flex flex-col gap-1 min-w-[160px]" class:opacity-40={controlsDisabled}>
			<span class="font-mono text-[10px] text-text-muted uppercase tracking-wider">
				Service Availability
			</span>
			<div class="flex items-center gap-2">
				<input
					type="range"
					min="0"
					max="100"
					value={$failureConfig.serviceAvailability}
					oninput={handleAvailabilityChange}
					disabled={controlsDisabled}
					class="flex-1 h-1.5 rounded-full appearance-none"
					class:cursor-pointer={!controlsDisabled}
					class:cursor-not-allowed={controlsDisabled}
					style="background: linear-gradient(to right, #e63946, #f48c06, #06d6a0);"
				/>
				<span class="font-mono text-xs text-text-primary w-8 text-right">
					{$failureConfig.serviceAvailability}%
				</span>
			</div>
		</div>

		<!-- Network Failure -->
		<div class="flex flex-col gap-1 min-w-[140px]" class:opacity-40={controlsDisabled}>
			<span class="font-mono text-[10px] text-text-muted uppercase tracking-wider">
				Network Failure
			</span>
			<div class="flex items-center gap-2">
				<input
					type="range"
					min="0"
					max="100"
					value={$failureConfig.networkFailureRate}
					oninput={handleNetworkChange}
					disabled={controlsDisabled}
					class="flex-1 h-1.5 rounded-full appearance-none"
					class:cursor-pointer={!controlsDisabled}
					class:cursor-not-allowed={controlsDisabled}
					style="background: linear-gradient(to right, #06d6a0, #f48c06, #e63946);"
				/>
				<span class="font-mono text-xs text-text-primary w-8 text-right">
					{$failureConfig.networkFailureRate}%
				</span>
			</div>
		</div>

		<!-- Rate Limit Toggle -->
		<div class="flex flex-col gap-1" class:opacity-40={controlsDisabled}>
			<span class="font-mono text-[10px] text-text-muted uppercase tracking-wider">
				Rate Limit
			</span>
			<button
				onclick={toggleRateLimit}
				disabled={controlsDisabled}
				class="px-3 py-1 rounded text-xs font-mono border transition-colors"
				style="
					background: {$failureConfig.rateLimitEnabled ? '#f48c0630' : 'transparent'};
					border-color: {$failureConfig.rateLimitEnabled ? '#f48c06' : '#ffffff15'};
					color: {$failureConfig.rateLimitEnabled ? '#f48c06' : '#64748b'};
				"
			>
				{$failureConfig.rateLimitEnabled ? 'ON' : 'OFF'}
			</button>
		</div>

		<!-- Infrastructure Down -->
		<div class="flex flex-col gap-1" class:opacity-40={controlsDisabled}>
			<span class="font-mono text-[10px] text-text-muted uppercase tracking-wider">
				Infrastructure
			</span>
			<button
				onclick={toggleInfraDown}
				disabled={controlsDisabled}
				class="px-3 py-1 rounded text-xs font-mono font-bold border-2 transition-all"
				style="
					background: {$failureConfig.infrastructureDown ? '#e6394640' : 'transparent'};
					border-color: {$failureConfig.infrastructureDown ? '#e63946' : '#ffffff15'};
					color: {$failureConfig.infrastructureDown ? '#e63946' : '#64748b'};
					{$failureConfig.infrastructureDown ? 'box-shadow: 0 0 12px #e6394640; animation: pulse 1.5s ease-in-out infinite;' : ''}
				"
			>
				{$failureConfig.infrastructureDown ? '⚠ DOWN ⚠' : 'UP'}
			</button>
		</div>

		<!-- Spacer -->
		<div class="flex-1"></div>

		<!-- Speed Control -->
		<div class="flex flex-col gap-1">
			<span class="font-mono text-[10px] text-text-muted uppercase tracking-wider">Speed</span>
			<div class="flex gap-1">
				{#each SPEED_OPTIONS as s}
					<button
						onclick={() => setSpeed(s)}
						class="px-2 py-1 rounded text-[10px] font-mono border transition-colors"
						style="
							background: {$speedMultiplier === s ? '#ffffff15' : 'transparent'};
							border-color: {$speedMultiplier === s ? '#ffffff30' : '#ffffff10'};
							color: {$speedMultiplier === s ? '#e2e8f0' : '#64748b'};
						"
					>
						{s}x
					</button>
				{/each}
			</div>
		</div>

		<!-- Launch / Reset -->
		<div class="flex gap-2">
			<button
				onclick={handleReset}
				class="px-3 py-2 rounded text-xs font-mono border border-white/10 text-text-secondary hover:text-text-primary hover:border-white/20 transition-colors"
			>
				↻ Reset
			</button>
			<button
				onclick={handleLaunch}
				disabled={$isRunning}
				class="px-5 py-2 rounded font-display font-bold text-sm transition-all"
				style="
					background: {$isRunning ? '#ffffff10' : 'linear-gradient(135deg, #00b4d8, #0077b6)'};
					color: {$isRunning ? '#64748b' : '#ffffff'};
					{$isRunning ? '' : 'box-shadow: 0 0 20px #00b4d840;'}
				"
			>
				{$isRunning ? 'In Flight...' : '🚀 LAUNCH'}
			</button>
		</div>
	</div>
</div>

<style>
	.chaos-monkey-bounce {
		display: inline-block;
		animation: monkey-bounce 1.5s ease-in-out infinite;
	}

	@keyframes monkey-bounce {
		0%, 100% { transform: translateY(0) rotate(0deg); }
		25% { transform: translateY(-2px) rotate(-5deg); }
		75% { transform: translateY(1px) rotate(5deg); }
	}

	.chaos-action-flash {
		animation: action-flash 0.3s ease-out;
	}

	@keyframes action-flash {
		0% { opacity: 0; transform: translateX(-5px); }
		100% { opacity: 1; transform: translateX(0); }
	}
</style>
