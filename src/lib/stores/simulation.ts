import { writable, derived, get } from 'svelte/store';
import type { RocketSimulation, FailureConfig, StrategyType } from '../simulation/types';
import { createAllRockets, tick, launchRockets } from '../simulation/engine';
import { DEFAULT_FAILURE_CONFIG } from '../constants';

// ============================================================
// Core Simulation Stores
// ============================================================

export const rockets = writable<RocketSimulation[]>(createAllRockets());
export const failureConfig = writable<FailureConfig>({ ...DEFAULT_FAILURE_CONFIG });
export const speedMultiplier = writable<number>(1);
export const isRunning = writable<boolean>(false);
export const simTime = writable<number>(0);

// ============================================================
// Derived Stores
// ============================================================

/** Get a specific rocket by strategy type */
export function getRocket(type: StrategyType) {
	return derived(rockets, ($rockets) => $rockets.find((r) => r.id === type));
}

/** Whether all rockets have finished (completed, failed, or stalled) */
export const allFinished = derived(rockets, ($rockets) =>
	$rockets.every(
		(r) =>
			r.state === 'completed' ||
			r.state === 'failed' ||
			r.state === 'idle'
	)
);

/** Count of active (in-flight) rockets */
export const activeCount = derived(rockets, ($rockets) =>
	$rockets.filter(
		(r) =>
			r.state === 'in-progress' ||
			r.state === 'retrying' ||
			r.state === 'paused' ||
			r.state === 'error-queue-stalled' ||
			r.state === 'repair-approaching' ||
			r.state === 'repair-docked' ||
			r.state === 'repair-departing'
	).length
);

// ============================================================
// Simulation Loop
// ============================================================

let animationFrameId: number | null = null;
let lastTimestamp: number | null = null;

function loop(timestamp: DOMHighResTimeStamp) {
	const running = get(isRunning);

	if (!running) {
		lastTimestamp = null;
		return;
	}

	if (lastTimestamp === null) {
		lastTimestamp = timestamp;
		animationFrameId = requestAnimationFrame(loop);
		return;
	}

	const wallDelta = timestamp - lastTimestamp;
	lastTimestamp = timestamp;

	// Cap delta to prevent huge jumps when tab is backgrounded
	const cappedDelta = Math.min(wallDelta, 100);
	const currentSpeed = get(speedMultiplier);
	const simDelta = cappedDelta * currentSpeed;

	const currentSimTime = get(simTime);
	const newSimTime = currentSimTime + simDelta;
	simTime.set(newSimTime);

	// Tick all rockets
	const currentRockets = get(rockets);
	const currentConfig = get(failureConfig);
	const updated = tick(currentRockets, currentConfig, simDelta, newSimTime);
	rockets.set(updated);

	// Check if all rockets are done
	const allDone = updated.every(
		(r) =>
			r.state === 'completed' ||
			r.state === 'failed'
	);

	if (allDone) {
		isRunning.set(false);
		lastTimestamp = null;
		return;
	}

	animationFrameId = requestAnimationFrame(loop);
}

// ============================================================
// Public Actions
// ============================================================

/** Launch all rockets and start the simulation loop */
export function launch() {
	const currentSimTime = get(simTime);
	rockets.update((r) => launchRockets(r, currentSimTime));
	isRunning.set(true);
	lastTimestamp = null;
	animationFrameId = requestAnimationFrame(loop);
}

/** Reset all rockets to idle state */
export function reset() {
	if (animationFrameId !== null) {
		cancelAnimationFrame(animationFrameId);
		animationFrameId = null;
	}
	lastTimestamp = null;
	isRunning.set(false);
	simTime.set(0);
	rockets.set(createAllRockets());
}

/** Update a specific failure config field */
export function updateFailureConfig(updates: Partial<FailureConfig>) {
	failureConfig.update((config) => ({ ...config, ...updates }));
}
