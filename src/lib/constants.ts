import type { StrategyType } from './simulation/types';

// ============================================================
// Rocket Configuration
// ============================================================

export const ROCKET_CONFIG: Record<StrategyType, {
	label: string;
	color: string;
	glowColor: string;
	description: string;
	goodFor: string;
}> = {
	temporal: {
		label: 'Temporal',
		color: '#00b4d8',
		glowColor: '#00b4d860',
		description: 'Durable execution with infinite retries. State is preserved across failures.',
		goodFor: 'Long-running workflows, multi-step processes, and any scenario where you need guaranteed completion.'
	},
	polly: {
		label: 'Standard Retries',
		color: '#f48c06',
		glowColor: '#f48c0660',
		description: 'Finite retries with exponential backoff. Good for transient faults.',
		goodFor: 'Simple API calls with transient failures. Not designed for long-running multi-step workflows.'
	},
	'no-retry': {
		label: 'No Retries',
		color: '#e63946',
		glowColor: '#e6394660',
		description: 'No error handling. Any failure is terminal.',
		goodFor: 'Idempotent operations where failure is acceptable, or where external systems handle retry.'
	},
	eda: {
		label: 'Event-Driven',
		color: '#7209b7',
		glowColor: '#7209b760',
		description: 'Event-driven sagas with message handlers. Messages retry then move to error queue for manual intervention.',
		goodFor: 'Decoupled, independently deployable services with durable messaging and eventual consistency. Orchestration is distributed across sagas, handlers, and message contracts.'
	}
};

// ============================================================
// Timing Constants (at 1x speed)
// ============================================================

export const TIMING = {
	/** Duration range for individual service calls (ms) */
	CALL_DURATION_MIN: 80,
	CALL_DURATION_MAX: 200,

	/** Pause between stages (ms) */
	STAGE_TRANSITION: 300,

	/** Launch countdown duration (ms) */
	COUNTDOWN_DURATION: 3000,

	// Temporal retry backoff
	// Tuned for visual simulation — real Temporal defaults are 1s initial, 2x coefficient
	// but we use shorter intervals so the demo feels responsive
	TEMPORAL_INITIAL_INTERVAL: 150,
	TEMPORAL_BACKOFF_COEFFICIENT: 2,
	TEMPORAL_MAX_INTERVAL: 5000,

	// Polly retry backoff
	POLLY_INITIAL_INTERVAL: 300,
	POLLY_BACKOFF_FACTOR: 2.5,
	POLLY_JITTER: 0.2,
	POLLY_MAX_RETRIES: 3,
	POLLY_CIRCUIT_BREAKER_THRESHOLD: 2,
	POLLY_CIRCUIT_BREAKER_RESET: 10000,

	// EDA retry pipeline (models typical defaults: 5 immediate + 3 delayed)
	// Intervals compressed for visual pacing — real delays would be 10s/20s/30s
	NSERVICEBUS_IMMEDIATE_RETRIES: 5,
	NSERVICEBUS_IMMEDIATE_DELAY: 120,
	NSERVICEBUS_DELAYED_RETRIES: 3,
	NSERVICEBUS_DELAYED_INTERVALS: [800, 1200, 1600],

	// Repair ship (EDA manual intervention simulation)
	/** How long the rocket sits stalled before the repair ship starts approaching */
	REPAIR_STALL_DURATION: 10000,
	/** How long the repair ship takes to fly in */
	REPAIR_APPROACH_DURATION: 12000,
	/** How long the repair ship stays docked while repairing */
	REPAIR_DOCKED_DURATION: 7000,
	/** How long the repair ship takes to fly away */
	REPAIR_DEPART_DURATION: 3500
};

// ============================================================
// Speed Options
// ============================================================

export const SPEED_OPTIONS = [0.5, 1, 2, 5] as const;
export type SpeedMultiplier = (typeof SPEED_OPTIONS)[number];

// ============================================================
// Default Failure Config
// ============================================================

export const DEFAULT_FAILURE_CONFIG = {
	serviceAvailability: 100,
	rateLimitEnabled: false,
	rateLimitBurstSize: 10,
	networkFailureRate: 0,
	infrastructureDown: false
};
