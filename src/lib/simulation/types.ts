// ============================================================
// Core Simulation Types for Durable Showcase
// ============================================================

/** The four execution strategy types */
export type StrategyType = 'temporal' | 'polly' | 'no-retry' | 'eda';

/** Rocket lifecycle states */
export type RocketState =
	| 'idle'
	| 'in-progress'
	| 'retrying'
	| 'paused'
	| 'failed'
	| 'completed'
	| 'error-queue-stalled'
	| 'repair-approaching'
	| 'repair-docked'
	| 'repair-departing';

/** Types of failures that can be injected */
export type FailureType = 'service-down' | 'rate-limited' | 'network-timeout' | 'infrastructure-down';

/** Result status for individual service calls */
export type CallStatus = 'pending' | 'in-progress' | 'success' | 'failed' | 'retrying';

/** Status of a service group cluster */
export type GroupStatus = 'pending' | 'in-progress' | 'success' | 'failed' | 'retrying';

// ============================================================
// Mission Structure
// ============================================================

/** A single service call within a mission stage */
export interface ServiceCall {
	id: string;
	service: string;
	method: string;
	dependsOn?: string[];
}

/** A logical group of related service calls (e.g., "Engine Systems") */
export interface ServiceGroup {
	name: string;
	calls: ServiceCall[];
}

/** A mission stage containing multiple service groups */
export interface MissionStage {
	name: string;
	groups: ServiceGroup[];
	baseDurationMs: number;
}

/** The complete mission definition */
export interface MissionDefinition {
	stages: MissionStage[];
	totalCalls: number;
	totalGroups: number;
}

// ============================================================
// Failure Configuration
// ============================================================

/** Controls for injecting failures into the simulation */
export interface FailureConfig {
	serviceAvailability: number;      // 0-100, per-call success probability
	rateLimitEnabled: boolean;
	rateLimitBurstSize: number;       // Calls allowed before throttling
	networkFailureRate: number;       // 0-100, independent failure probability
	infrastructureDown: boolean;      // Override: all calls fail
}

// ============================================================
// Simulation Events
// ============================================================

/** Base event for the event log */
export interface SimulationEvent {
	timestamp: number;
	rocketId: StrategyType;
	type: string;
	message: string;
	detail?: Record<string, unknown>;
}

/** Temporal-specific workflow history event */
export interface WorkflowEvent {
	eventId: number;
	eventType: string;
	timestamp: number;
	attributes: Record<string, unknown>;
}

/** Error queue message (EDA pattern) */
export interface ErrorQueueMessage {
	messageId: string;
	messageType: string;
	failedAt: number;
	retryCount: number;
	lastError: string;
	originalDestination: string;
}

// ============================================================
// Rocket State
// ============================================================

/** Runtime state for tracking service call results */
export interface CallResult {
	callId: string;
	status: CallStatus;
	attempts: number;
	lastFailureType?: FailureType;
}

/** Runtime state for tracking service group progress */
export interface GroupResult {
	groupName: string;
	status: GroupStatus;
	completedCalls: number;
	totalCalls: number;
	callResults: CallResult[];
}

/** Complete state of a single rocket during simulation */
export interface RocketSimulation {
	id: StrategyType;
	label: string;
	state: RocketState;

	// Progress tracking
	currentStageIndex: number;
	currentGroupIndex: number;
	currentCallIndex: number;
	completedCalls: number;
	totalCalls: number;

	// Visual position (0-1 across entire mission)
	overallProgress: number;

	// Retry state
	retryCount: number;
	totalRetries: number;
	maxRetries: number | null;         // null = infinite (Temporal)
	currentBackoffMs: number;
	backoffTimerRemaining: number;

	// Per-stage tracking
	stageResults: GroupResult[][];     // [stageIndex][groupIndex]

	// Event log (shared format)
	eventLog: SimulationEvent[];

	// EDA-specific
	errorQueueMessages: ErrorQueueMessage[];
	sagaState: Record<string, 'pending' | 'completed' | 'failed'>;
	immediateRetriesRemaining: number;
	delayedRetriesRemaining: number;

	// Temporal-specific
	workflowHistory: WorkflowEvent[];
	preservedState: Record<string, unknown>;

	// Repair ship (EDA manual intervention)
	repairTimeRemaining: number;       // ms until repair ship arrives and fixes
	repairShipProgress: number;        // 0-1 for repair ship approach animation

	// Completion
	isFirstToComplete: boolean;        // True if this rocket was the first to complete

	// Internal timing
	currentCallProgress: number;       // 0-1 within the current call
	currentCallDuration: number;       // ms for current call at 1x
}

// ============================================================
// Strategy Interface
// ============================================================

/** Result of attempting a single service call */
export interface CallAttemptResult {
	success: boolean;
	failureType?: FailureType;
}

/** Interface that each execution strategy must implement */
export interface ExecutionStrategy {
	type: StrategyType;

	/** Called when a service call fails. Returns the updated rocket state. */
	onFailure(rocket: RocketSimulation, failureType: FailureType, simTime: number): RocketSimulation;

	/** Whether the strategy should retry after a failure */
	shouldRetry(rocket: RocketSimulation): boolean;

	/** Get the delay before next retry in ms (at 1x speed) */
	getRetryDelay(rocket: RocketSimulation): number;

	/** Generate strategy-specific event log entries */
	logEvent(rocket: RocketSimulation, eventType: string, detail?: Record<string, unknown>): SimulationEvent;
}

// ============================================================
// Simulation State (top-level)
// ============================================================

/** The complete simulation state */
export interface SimulationState {
	rockets: RocketSimulation[];
	failureConfig: FailureConfig;
	speedMultiplier: number;
	isRunning: boolean;
	simTime: number;                   // Accumulated simulation time in ms
	wallStartTime: number | null;      // Wall clock time when simulation started
}
