import { writable, get } from 'svelte/store';
import { updateFailureConfig, isRunning, failureConfig, speedMultiplier } from './simulation';
import { DEFAULT_FAILURE_CONFIG } from '$lib/constants';

// ============================================================
// Chaos Space Monkey
//
// Modeled after Netflix's Chaos Monkey: kills individual things
// completely rather than degrading everything at once. Periods
// of full normal operation between targeted disruptions.
// ============================================================

export type ControlMode = 'chaos' | 'manual';

export const controlMode = writable<ControlMode>('chaos');

/** Recent chaos monkey action for display */
export interface ChaosAction {
	message: string;
	timestamp: number;
}

export const lastChaosAction = writable<ChaosAction | null>(null);
export const chaosHistory = writable<ChaosAction[]>([]);

// ============================================================
// Chaos Monkey Engine
// ============================================================

let chaosTimeout: ReturnType<typeof setTimeout> | null = null;
let activeDisruption: ReturnType<typeof setTimeout> | null = null;

function logAction(message: string) {
	const action: ChaosAction = { message, timestamp: Date.now() };
	lastChaosAction.set(action);
	chaosHistory.update(h => [...h.slice(-14), action]);
}

/** Restore everything to normal operation */
function restoreAll() {
	updateFailureConfig({ ...DEFAULT_FAILURE_CONFIG });
}

/**
 * A single chaos "incident" — kills one thing completely,
 * holds it for a duration, then restores it.
 */
type Incident = {
	name: string;
	/** Weight for random selection */
	weight: number;
	/** Execute the disruption. Returns restore function + how long to hold it (ms). */
	execute: () => { restore: () => void; durationMs: number };
};

const FULL_KILL_MIN = 14000;  // 14s minimum for full outages
const FULL_KILL_MAX = 22000;  // 22s maximum
const PARTIAL_MIN = 5000;     // 5s for partial degradation
const PARTIAL_MAX = 10000;    // 10s

const incidents: Incident[] = [
	{
		name: 'service-kill',
		weight: 4,
		execute: () => {
			// Kill service availability — simulates instance termination
			// Chaos Monkey kills the instance and it stays dead until replacement spins up
			const severity = Math.random();
			let target: number;
			let label: string;
			let duration: number;

			if (severity < 0.65) {
				// Full kill — 0% availability, long outage
				target = 0;
				label = 'Service instance terminated';
				duration = FULL_KILL_MIN + Math.random() * (FULL_KILL_MAX - FULL_KILL_MIN);
			} else if (severity < 0.85) {
				// Severe degradation — very low availability, still long
				target = Math.floor(Math.random() * 15); // 0-14%
				label = `Service degraded → ${target}%`;
				duration = FULL_KILL_MIN + Math.random() * (PARTIAL_MAX - PARTIAL_MIN);
			} else {
				// Partial — some availability remains, shorter
				target = 40 + Math.floor(Math.random() * 30); // 40-69%
				label = `Service partially available → ${target}%`;
				duration = PARTIAL_MIN + Math.random() * (PARTIAL_MAX - PARTIAL_MIN);
			}
			updateFailureConfig({ serviceAvailability: target });
			logAction(label);
			return {
				restore: () => {
					updateFailureConfig({ serviceAvailability: 100 });
					logAction('Service restored');
				},
				durationMs: duration
			};
		}
	},
	{
		name: 'network-partition',
		weight: 2,
		execute: () => {
			const rate = 70 + Math.floor(Math.random() * 30); // 70-99%
			updateFailureConfig({ networkFailureRate: rate });
			logAction(`Network partition → ${rate}% loss`);
			return {
				restore: () => {
					updateFailureConfig({ networkFailureRate: 0 });
					logAction('Network restored');
				},
				durationMs: FULL_KILL_MIN + Math.random() * (FULL_KILL_MAX - FULL_KILL_MIN)
			};
		}
	},
	{
		name: 'rate-limit-storm',
		weight: 2,
		execute: () => {
			updateFailureConfig({ rateLimitEnabled: true });
			logAction('Rate limit triggered');
			return {
				restore: () => {
					updateFailureConfig({ rateLimitEnabled: false });
					logAction('Rate limit cleared');
				},
				durationMs: PARTIAL_MIN + Math.random() * (PARTIAL_MAX - PARTIAL_MIN)
			};
		}
	},
	{
		name: 'infra-outage',
		weight: 2,
		execute: () => {
			// Total infrastructure kill — the big one, stays down a long time
			updateFailureConfig({ infrastructureDown: true });
			logAction('Infrastructure DOWN');
			return {
				restore: () => {
					updateFailureConfig({ infrastructureDown: false });
					logAction('Infrastructure restored');
				},
				durationMs: FULL_KILL_MIN + Math.random() * (FULL_KILL_MAX - FULL_KILL_MIN)
			};
		}
	},
	{
		name: 'compound-failure',
		weight: 2,
		execute: () => {
			const avail = Math.floor(Math.random() * 20); // 0-19%
			const network = 40 + Math.floor(Math.random() * 40); // 40-79%
			updateFailureConfig({
				serviceAvailability: avail,
				networkFailureRate: network,
				rateLimitEnabled: true
			});
			logAction(`Cascading failure — availability ${avail}%, network ${network}%`);
			return {
				restore: () => {
					updateFailureConfig({
						serviceAvailability: 100,
						networkFailureRate: 0,
						rateLimitEnabled: false
					});
					logAction('Systems recovered');
				},
				durationMs: FULL_KILL_MIN + Math.random() * (FULL_KILL_MAX - FULL_KILL_MIN)
			};
		}
	}
];

function pickIncident(): Incident {
	const totalWeight = incidents.reduce((sum, i) => sum + i.weight, 0);
	let roll = Math.random() * totalWeight;
	for (const incident of incidents) {
		roll -= incident.weight;
		if (roll <= 0) return incident;
	}
	return incidents[0];
}

/**
 * Core loop: alternate between calm periods and incidents.
 *
 * Modeled after Netflix Chaos Monkey:
 * 1. Normal operation for 5-10 seconds (services running fine)
 * 2. Incident strikes — one thing killed completely
 * 3. Disruption held for a period of time to bring down typical retry backoffs.
 * 4. Auto-restore, back to step 1
 */
function scheduleCycle() {
	if (!get(isRunning) || get(controlMode) !== 'chaos') return;

	// Scale timings inversely with speed — at 5x, chaos acts 5x faster
	const speed = get(speedMultiplier);

	// Calm period — everything works, rockets make progress
	const calmDuration = (5000 + Math.random() * 5000) / speed; // 5-10s at 1x

	chaosTimeout = setTimeout(() => {
		if (!get(isRunning) || get(controlMode) !== 'chaos') return;

		// Pick and execute an incident
		const incident = pickIncident();
		const { restore, durationMs } = incident.execute();

		// Hold the disruption for the incident-specific duration, scaled by speed
		activeDisruption = setTimeout(() => {
			if (get(controlMode) === 'chaos') {
				restore();
			}
			// Schedule next cycle
			scheduleCycle();
		}, durationMs / speed);
	}, calmDuration);
}

export function startChaosMonkey() {
	stopChaosMonkey();
	chaosHistory.set([]);
	lastChaosAction.set(null);

	// Start with a brief calm period, then first incident
	logAction('Chaos Space Monkey activated');
	scheduleCycle();
}

export function stopChaosMonkey() {
	if (chaosTimeout !== null) {
		clearTimeout(chaosTimeout);
		chaosTimeout = null;
	}
	if (activeDisruption !== null) {
		clearTimeout(activeDisruption);
		activeDisruption = null;
	}
}

export function setControlMode(mode: ControlMode) {
	controlMode.set(mode);
	if (mode === 'manual') {
		stopChaosMonkey();
	} else if (get(isRunning)) {
		startChaosMonkey();
	}
}
