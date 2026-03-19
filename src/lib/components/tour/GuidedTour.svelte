<script lang="ts">
	import { tourActive, tourStep, nextTourStep, prevTourStep, endTour } from '$lib/stores/ui';
	import { launch, reset, updateFailureConfig } from '$lib/stores/simulation';
	import { toggleCodePanel, codePanelOpen, selectRocketCode } from '$lib/stores/ui';
	import { tourSteps } from './tourSteps';
	import type { TourAction } from './tourSteps';

	const step = $derived(tourSteps[$tourStep]);
	const isFirst = $derived($tourStep === 0);
	const isLast = $derived($tourStep === tourSteps.length - 1);

	// Responsive: pin tour card to bottom on mobile
	let innerWidth = $state(window.innerWidth);
	const isMobile = $derived(innerWidth < 768);


	// Timer state managed outside Svelte reactivity to avoid infinite loops
	let timerBarEl: HTMLDivElement | undefined = $state();
	let countdownEl: HTMLSpanElement | undefined = $state();
	let animFrame = 0;
	let timerStartMs = 0;
	let currentDurationMs = 0;
	let autoAdvanceTimeout: ReturnType<typeof setTimeout> | undefined;
	let scheduledTimeouts: ReturnType<typeof setTimeout>[] = [];

	function clearScheduledTimeouts() {
		for (const t of scheduledTimeouts) clearTimeout(t);
		scheduledTimeouts = [];
	}

	function executeActions(actions: TourAction[]) {
		for (const action of actions) {
			switch (action.type) {
				case 'set-availability':
					updateFailureConfig({ serviceAvailability: action.value });
					break;
				case 'set-network-failure':
					updateFailureConfig({ networkFailureRate: action.value });
					break;
				case 'set-infra-down':
					updateFailureConfig({ infrastructureDown: action.value });
					break;
				case 'launch':
					launch();
					break;
				case 'reset':
					reset();
					break;
				case 'open-code-panel':
					if (action.strategy) {
						selectRocketCode(action.strategy as any);
					} else if (!$codePanelOpen) {
						toggleCodePanel();
					}
					break;
				case 'close-code-panel':
					if ($codePanelOpen) toggleCodePanel();
					break;
				case 'infra-schedule':
					for (const [delayMs, infraDown] of action.schedule) {
						scheduledTimeouts.push(
							setTimeout(() => {
								updateFailureConfig({ infrastructureDown: infraDown });
							}, delayMs)
						);
					}
					break;
			}
		}
	}

	function tickTimer() {
		const elapsed = performance.now() - timerStartMs;
		const pct = Math.min(100, (elapsed / currentDurationMs) * 100);
		const remaining = Math.max(0, Math.ceil((currentDurationMs - elapsed) / 1000));

		if (timerBarEl) {
			timerBarEl.style.width = `${pct}%`;
		}
		if (countdownEl) {
			countdownEl.textContent = `${remaining}s`;
		}

		if (elapsed < currentDurationMs) {
			animFrame = requestAnimationFrame(tickTimer);
		}
	}

	function startTimer(durationMs: number) {
		stopTimer();
		timerStartMs = performance.now();
		currentDurationMs = durationMs;
		animFrame = requestAnimationFrame(tickTimer);

		autoAdvanceTimeout = setTimeout(() => {
			if ($tourStep < tourSteps.length - 1) {
				nextTourStep();
			} else {
				endTour();
			}
		}, durationMs);
	}

	function stopTimer() {
		cancelAnimationFrame(animFrame);
		clearTimeout(autoAdvanceTimeout);
	}

	function stopAll() {
		stopTimer();
		clearScheduledTimeouts();
	}

	// React to step changes — use untrack to avoid reading state we write
	$effect(() => {
		const active = $tourActive;
		const stepIdx = $tourStep;

		if (!active) {
			stopAll();
			return;
		}

		const currentStep = tourSteps[stepIdx];
		if (!currentStep) return;

		if (currentStep.actions) {
			executeActions(currentStep.actions);
		}

		startTimer(currentStep.durationMs);

		return () => stopTimer();
	});

	function handleNext() {
		stopTimer();
		if (isLast) {
			endTour();
		} else {
			nextTourStep();
		}
	}

	function handlePrev() {
		stopTimer();
		prevTourStep();
	}

	function handleSkip() {
		stopAll();
		updateFailureConfig({ infrastructureDown: false });
		if ($codePanelOpen) toggleCodePanel();
		endTour();
	}

	function handleKeydown(e: KeyboardEvent) {
		if (!$tourActive) return;
		if (e.key === 'Escape') handleSkip();
		else if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); handleNext(); }
		else if (e.key === 'ArrowLeft') { e.preventDefault(); handlePrev(); }
	}
</script>

<svelte:window onkeydown={handleKeydown} onresize={() => innerWidth = window.innerWidth} />

{#if $tourActive && step}
	<!-- Overlay — semi-transparent so rockets stay visible -->
	<div class="fixed inset-0 z-50 pointer-events-none">
		<div class="absolute inset-0 bg-black/30 pointer-events-auto"></div>

		<!-- Tour card — moves based on step position; pinned to bottom on mobile -->
		<div
			class="absolute z-60 pointer-events-auto"
			style="
				{isMobile
					? 'bottom: 12px; left: 12px; right: 12px;'
					: step.position === 'center' ? 'top: 45%; left: 50%; transform: translate(-50%, -50%);'
					: step.position === 'top' ? 'bottom: 180px; left: 50%; transform: translateX(-50%);'
					: step.position === 'bottom-left' ? 'bottom: 160px; left: 24px;'
					: step.position === 'bottom-center' ? 'bottom: 160px; left: 50%; transform: translateX(-50%);'
					: step.position === 'bottom-right' ? 'bottom: 160px; right: 24px;'
					: ''}
				transition: all 0.4s ease-out;
			"
		>
			{#key $tourStep}
			<div
				class="rounded-xl max-w-md shadow-2xl border overflow-hidden tour-card-enter"
				style="background: #0d1117f0; border-color: #00b4d840; box-shadow: 0 0 40px #00b4d815;"
			>
				<!-- Countdown bar -->
				<div class="h-1 w-full" style="background: #ffffff08;">
					<div
						bind:this={timerBarEl}
						class="h-full"
						style="width: 0%; background: linear-gradient(90deg, #00b4d8, #0077b6);"
					></div>
				</div>

				<div class="p-5">
					<!-- Step counter + countdown -->
					<div class="flex items-center justify-between mb-3">
						<div class="flex items-center gap-2">
							<span class="font-mono text-[10px] uppercase tracking-wider" style="color: #00b4d8;">
								Step {$tourStep + 1} of {tourSteps.length}
							</span>
							<div class="flex gap-1">
								{#each tourSteps as _, i}
									<div
										class="w-1.5 h-1.5 rounded-full transition-all duration-300"
										style="background: {i === $tourStep ? '#00b4d8' : i < $tourStep ? '#00b4d860' : '#ffffff15'};"
									></div>
								{/each}
							</div>
						</div>
						<div class="flex items-center gap-3">
							<span
								bind:this={countdownEl}
								class="font-mono text-[10px] tabular-nums"
								style="color: #00b4d880;"
							></span>
							<button
								onclick={handleSkip}
								class="font-mono text-[10px] text-text-muted hover:text-text-primary transition-colors"
							>
								Skip Tour
							</button>
						</div>
					</div>

					<!-- Content -->
					<h3 class="font-display text-base font-bold text-text-primary mb-1.5">
						{step.title}
					</h3>
					<p class="font-body text-sm text-text-secondary leading-relaxed mb-4">
						{step.description}
					</p>

					<!-- Navigation -->
					<div class="flex items-center justify-between">
						<button
							onclick={handlePrev}
							disabled={isFirst}
							class="px-3 py-1.5 rounded text-xs font-mono transition-colors"
							style="color: {isFirst ? '#64748b40' : '#94a3b8'};"
						>
							&larr; Back
						</button>
						<button
							onclick={handleNext}
							class="px-4 py-1.5 rounded text-xs font-mono font-bold transition-all hover:brightness-125"
							style="background: #00b4d830; color: #00b4d8; border: 1px solid #00b4d840;"
						>
							{isLast ? 'Finish' : 'Next \u2192'}
						</button>
					</div>
				</div>
			</div>
		{/key}
		</div>
	</div>
{/if}

<style>
	.tour-card-enter {
		animation: tour-fade-in 0.3s ease-out;
	}

	@keyframes tour-fade-in {
		from { opacity: 0; }
		to { opacity: 1; }
	}
</style>
