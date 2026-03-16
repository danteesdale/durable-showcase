import type {
	RocketSimulation,
	FailureConfig,
	ExecutionStrategy,
	CallResult,
	GroupResult,
	SimulationEvent,
	StrategyType
} from './types';
import { MISSION } from './missionStages';
import { SeededRandom, RateLimiter, attemptServiceCall } from './failures';
import { temporalStrategy } from './strategies/temporal';
import { pollyStrategy } from './strategies/polly';
import { noRetryStrategy } from './strategies/noRetry';
import { edaStrategy } from './strategies/eda';
import { TIMING, ROCKET_CONFIG } from '../constants';

// ============================================================
// Strategy Registry
// ============================================================

const strategies: Record<StrategyType, ExecutionStrategy> = {
	temporal: temporalStrategy,
	polly: pollyStrategy,
	'no-retry': noRetryStrategy,
	eda: edaStrategy
};

// ============================================================
// Per-Rocket Runtime State (not serialized)
// ============================================================

interface RocketRuntime {
	rng: SeededRandom;
	rateLimiter: RateLimiter;
}

const runtimes = new Map<StrategyType, RocketRuntime>();

// ============================================================
// Rocket Initialization
// ============================================================

export function createRocket(strategyType: StrategyType, seed: number): RocketSimulation {
	const totalCalls = MISSION.totalCalls;

	// Build stage results structure
	const stageResults: GroupResult[][] = MISSION.stages.map((stage) =>
		stage.groups.map((group) => ({
			groupName: group.name,
			status: 'pending' as const,
			completedCalls: 0,
			totalCalls: group.calls.length,
			callResults: group.calls.map((call) => ({
				callId: call.id,
				status: 'pending' as const,
				attempts: 0
			}))
		}))
	);

	// Initialize saga state for EDA
	const sagaState: Record<string, 'pending' | 'completed' | 'failed'> = {};
	MISSION.stages.forEach((_, i) => {
		sagaState[`stage-${i}`] = 'pending';
	});

	// Initialize runtime (RNG + rate limiter)
	runtimes.set(strategyType, {
		rng: new SeededRandom(seed),
		rateLimiter: new RateLimiter(10)
	});

	return {
		id: strategyType,
		label: ROCKET_CONFIG[strategyType].label,
		state: 'idle',

		currentStageIndex: 0,
		currentGroupIndex: 0,
		currentCallIndex: 0,
		completedCalls: 0,
		totalCalls,

		overallProgress: 0,

		retryCount: 0,
		totalRetries: 0,
		maxRetries: strategyType === 'temporal' ? null : (strategyType === 'polly' ? TIMING.POLLY_MAX_RETRIES : 0),
		currentBackoffMs: 0,
		backoffTimerRemaining: 0,

		stageResults,

		eventLog: [],

		errorQueueMessages: [],
		sagaState,
		immediateRetriesRemaining: TIMING.NSERVICEBUS_IMMEDIATE_RETRIES,
		delayedRetriesRemaining: TIMING.NSERVICEBUS_DELAYED_RETRIES,

		workflowHistory: [],
		preservedState: {},

		repairTimeRemaining: 0,
		repairShipProgress: 0,

		isFirstToComplete: false,

		currentCallProgress: 0,
		currentCallDuration: randomCallDuration(strategyType)
	};
}

function randomCallDuration(strategyType: StrategyType): number {
	const runtime = runtimes.get(strategyType);
	if (!runtime) return TIMING.CALL_DURATION_MIN;
	return runtime.rng.range(TIMING.CALL_DURATION_MIN, TIMING.CALL_DURATION_MAX);
}

/** Create all four rockets with different seeds */
export function createAllRockets(): RocketSimulation[] {
	return [
		createRocket('temporal', 42),
		createRocket('polly', 137),
		createRocket('no-retry', 256),
		createRocket('eda', 389)
	];
}

// ============================================================
// Simulation Tick
// ============================================================

/**
 * Advance the simulation by `deltaMs` (already multiplied by speed).
 * Returns updated rockets array.
 */
export function tick(
	rockets: RocketSimulation[],
	failureConfig: FailureConfig,
	deltaMs: number,
	simTime: number
): RocketSimulation[] {
	// Check if anyone was already completed before this tick
	const hadCompletedBefore = rockets.some((r) => r.state === 'completed');

	const updated = rockets.map((rocket) => {
		const result = tickRocket(rocket, failureConfig, deltaMs, simTime);
		return { ...result };
	});

	// Mark the first rocket to complete (if none were completed before)
	if (!hadCompletedBefore) {
		const firstCompleted = updated.find((r) => r.state === 'completed');
		if (firstCompleted) {
			firstCompleted.isFirstToComplete = true;
		}
	}

	return updated;
}

function tickRocket(
	rocket: RocketSimulation,
	failureConfig: FailureConfig,
	deltaMs: number,
	simTime: number
): RocketSimulation {
	// Skip rockets in terminal or idle states
	if (
		rocket.state === 'idle' ||
		rocket.state === 'failed' ||
		rocket.state === 'completed'
	) {
		return rocket;
	}

	// EDA error-queue-stalled: wait, then dispatch repair ship
	if (rocket.state === 'error-queue-stalled') {
		rocket.repairTimeRemaining -= deltaMs;
		if (rocket.repairTimeRemaining <= 0) {
			rocket.state = 'repair-approaching';
			rocket.repairTimeRemaining = TIMING.REPAIR_APPROACH_DURATION;
			rocket.repairShipProgress = 0;
			rocket.eventLog.push({
				timestamp: simTime,
				rocketId: rocket.id,
				type: 'RepairDispatched',
				message: '🔧 Manual intervention dispatched — repair crew en route'
			});
		}
		return rocket;
	}

	// EDA repair-approaching: repair ship flying in
	if (rocket.state === 'repair-approaching') {
		rocket.repairTimeRemaining -= deltaMs;
		rocket.repairShipProgress = 1 - Math.max(0, rocket.repairTimeRemaining / TIMING.REPAIR_APPROACH_DURATION);
		if (rocket.repairTimeRemaining <= 0) {
			rocket.state = 'repair-docked';
			rocket.repairTimeRemaining = TIMING.REPAIR_DOCKED_DURATION;
			rocket.repairShipProgress = 0;
		}
		return rocket;
	}

	// EDA repair-docked: repairing at the rocket
	if (rocket.state === 'repair-docked') {
		rocket.repairTimeRemaining -= deltaMs;
		rocket.repairShipProgress = 1 - Math.max(0, rocket.repairTimeRemaining / TIMING.REPAIR_DOCKED_DURATION);
		if (rocket.repairTimeRemaining <= 0) {
			// Repair complete — reset EDA retry budgets and resume rocket
			rocket.immediateRetriesRemaining = TIMING.NSERVICEBUS_IMMEDIATE_RETRIES;
			rocket.delayedRetriesRemaining = TIMING.NSERVICEBUS_DELAYED_RETRIES;
			rocket.retryCount = 0;
			rocket.currentCallProgress = 0;
			rocket.currentCallDuration = randomCallDuration(rocket.id);

			// Reset the failed call status so it can be retried
			const currentStage = rocket.stageResults[rocket.currentStageIndex];
			const currentGroup = currentStage[rocket.currentGroupIndex];
			const currentCall = currentGroup.callResults[rocket.currentCallIndex];
			currentCall.status = 'in-progress';
			currentGroup.status = 'in-progress';

			// Start departure — rocket resumes while ship flies away
			rocket.state = 'repair-departing';
			rocket.repairTimeRemaining = TIMING.REPAIR_DEPART_DURATION;
			rocket.repairShipProgress = 0;

			rocket.eventLog.push({
				timestamp: simTime,
				rocketId: rocket.id,
				type: 'RepairComplete',
				message: '✅ Repair complete — message retried from error queue, resuming mission'
			});
		}
		return rocket;
	}

	// EDA repair-departing: ship flies away, rocket resumes normal flight
	if (rocket.state === 'repair-departing') {
		rocket.repairTimeRemaining -= deltaMs;
		rocket.repairShipProgress = 1 - Math.max(0, rocket.repairTimeRemaining / TIMING.REPAIR_DEPART_DURATION);
		if (rocket.repairTimeRemaining <= 0) {
			rocket.state = 'in-progress';
			rocket.repairShipProgress = 0;
		}
		// Don't return — fall through to normal in-progress tick so the rocket flies while ship departs
	}

	// Handle retry countdown
	if (rocket.state === 'paused' || rocket.state === 'retrying') {
		rocket.backoffTimerRemaining -= deltaMs;
		if (rocket.backoffTimerRemaining <= 0) {
			// Timer expired — retry the call
			rocket.backoffTimerRemaining = 0;

			// Add timer fired event for Temporal
			if (rocket.id === 'temporal') {
				rocket.workflowHistory.push({
					eventId: rocket.workflowHistory.length + 1,
					eventType: 'TimerFired',
					timestamp: simTime,
					attributes: {}
				});
			}

			// Reset to in-progress and attempt the call again
			rocket.state = 'in-progress';
			rocket.currentCallProgress = 0;
			rocket.currentCallDuration = randomCallDuration(rocket.id);
		}
		return rocket;
	}

	// In-progress: advance through current service call
	rocket.currentCallProgress += deltaMs / rocket.currentCallDuration;

	if (rocket.currentCallProgress >= 1) {
		// Call execution complete — determine success or failure
		rocket.currentCallProgress = 0;

		const runtime = runtimes.get(rocket.id);
		if (!runtime) return rocket;

		const result = attemptServiceCall(
			runtime.rng,
			failureConfig,
			runtime.rateLimiter,
			simTime
		);

		const currentStage = rocket.stageResults[rocket.currentStageIndex];
		const currentGroup = currentStage[rocket.currentGroupIndex];
		const currentCall = currentGroup.callResults[rocket.currentCallIndex];
		currentCall.attempts++;

		if (result.success) {
			handleCallSuccess(rocket, currentCall, currentGroup, simTime);
		} else {
			handleCallFailure(rocket, currentCall, currentGroup, result.failureType!, simTime);
		}
	}

	// Update overall progress
	rocket.overallProgress = rocket.completedCalls / rocket.totalCalls;

	return rocket;
}

function handleCallSuccess(
	rocket: RocketSimulation,
	currentCall: CallResult,
	currentGroup: GroupResult,
	simTime: number
): void {
	currentCall.status = 'success';
	currentGroup.completedCalls++;
	rocket.completedCalls++;

	// Reset retry counters for next call
	rocket.retryCount = 0;
	if (rocket.id === 'eda') {
		rocket.immediateRetriesRemaining = TIMING.NSERVICEBUS_IMMEDIATE_RETRIES;
		rocket.delayedRetriesRemaining = TIMING.NSERVICEBUS_DELAYED_RETRIES;
	}

	// Log success event
	const strategy = strategies[rocket.id];
	rocket.eventLog.push({
		timestamp: simTime,
		rocketId: rocket.id,
		type: 'CallSuccess',
		message: `Call ${currentCall.callId} → Success`,
		detail: { callId: currentCall.callId }
	});

	// Temporal workflow history
	if (rocket.id === 'temporal') {
		rocket.workflowHistory.push({
			eventId: rocket.workflowHistory.length + 1,
			eventType: 'ActivityTaskCompleted',
			timestamp: simTime,
			attributes: { activityType: currentCall.callId, result: 'OK' }
		});
	}

	// Check if group is complete
	if (currentGroup.completedCalls >= currentGroup.totalCalls) {
		currentGroup.status = 'success';
	} else {
		currentGroup.status = 'in-progress';
	}

	// Advance to next call
	advanceToNextCall(rocket, simTime);
}

function handleCallFailure(
	rocket: RocketSimulation,
	currentCall: CallResult,
	currentGroup: GroupResult,
	failureType: string,
	simTime: number
): void {
	currentCall.status = 'failed';
	currentCall.lastFailureType = failureType as any;
	currentGroup.status = 'failed';

	const strategy = strategies[rocket.id];
	strategy.onFailure(rocket, failureType as any, simTime);
}

function advanceToNextCall(rocket: RocketSimulation, simTime: number): void {
	const stage = MISSION.stages[rocket.currentStageIndex];
	const group = stage.groups[rocket.currentGroupIndex];

	// Try next call in current group
	if (rocket.currentCallIndex + 1 < group.calls.length) {
		rocket.currentCallIndex++;
		rocket.currentCallDuration = randomCallDuration(rocket.id);
		rocket.currentCallProgress = 0;

		// Mark new call as in-progress
		const callResult = rocket.stageResults[rocket.currentStageIndex][rocket.currentGroupIndex].callResults[rocket.currentCallIndex];
		callResult.status = 'in-progress';

		// Log for Temporal
		if (rocket.id === 'temporal') {
			rocket.workflowHistory.push({
				eventId: rocket.workflowHistory.length + 1,
				eventType: 'ActivityTaskScheduled',
				timestamp: simTime,
				attributes: { activityType: callResult.callId }
			});
		}
		return;
	}

	// Try next group in current stage
	if (rocket.currentGroupIndex + 1 < stage.groups.length) {
		rocket.currentGroupIndex++;
		rocket.currentCallIndex = 0;
		rocket.currentCallDuration = randomCallDuration(rocket.id);
		rocket.currentCallProgress = 0;

		const newGroup = rocket.stageResults[rocket.currentStageIndex][rocket.currentGroupIndex];
		newGroup.status = 'in-progress';
		newGroup.callResults[0].status = 'in-progress';

		if (rocket.id === 'temporal') {
			rocket.workflowHistory.push({
				eventId: rocket.workflowHistory.length + 1,
				eventType: 'ActivityTaskScheduled',
				timestamp: simTime,
				attributes: { activityType: newGroup.callResults[0].callId }
			});
		}
		return;
	}

	// Stage complete — update saga state for EDA
	if (rocket.id === 'eda') {
		rocket.sagaState[`stage-${rocket.currentStageIndex}`] = 'completed';
	}

	// Try next stage
	if (rocket.currentStageIndex + 1 < MISSION.stages.length) {
		rocket.currentStageIndex++;
		rocket.currentGroupIndex = 0;
		rocket.currentCallIndex = 0;
		rocket.currentCallDuration = randomCallDuration(rocket.id);
		rocket.currentCallProgress = 0;

		const newStage = rocket.stageResults[rocket.currentStageIndex];
		newStage[0].status = 'in-progress';
		newStage[0].callResults[0].status = 'in-progress';

		if (rocket.id === 'temporal') {
			rocket.workflowHistory.push({
				eventId: rocket.workflowHistory.length + 1,
				eventType: 'ActivityTaskScheduled',
				timestamp: simTime,
				attributes: { activityType: newStage[0].callResults[0].callId }
			});
		}
		return;
	}

	// Mission complete!
	rocket.state = 'completed';
	rocket.overallProgress = 1;

	if (rocket.id === 'temporal') {
		rocket.workflowHistory.push({
			eventId: rocket.workflowHistory.length + 1,
			eventType: 'WorkflowExecutionCompleted',
			timestamp: simTime,
			attributes: { result: 'Mission Complete' }
		});
	}

	rocket.eventLog.push({
		timestamp: simTime,
		rocketId: rocket.id,
		type: 'MissionComplete',
		message: `Mission complete! ${rocket.completedCalls}/${rocket.totalCalls} calls succeeded. ${rocket.totalRetries} total retries.`
	});
}

/** Start all idle rockets */
export function launchRockets(rockets: RocketSimulation[], simTime: number): RocketSimulation[] {
	return rockets.map((rocket) => {
		if (rocket.state !== 'idle') return rocket;

		rocket.state = 'in-progress';

		// Mark first call as in-progress
		rocket.stageResults[0][0].status = 'in-progress';
		rocket.stageResults[0][0].callResults[0].status = 'in-progress';

		// Initial events
		if (rocket.id === 'temporal') {
			rocket.workflowHistory.push({
				eventId: 1,
				eventType: 'WorkflowExecutionStarted',
				timestamp: simTime,
				attributes: { workflowType: 'RocketMission' }
			});
			rocket.workflowHistory.push({
				eventId: 2,
				eventType: 'ActivityTaskScheduled',
				timestamp: simTime,
				attributes: { activityType: rocket.stageResults[0][0].callResults[0].callId }
			});
		}

		rocket.eventLog.push({
			timestamp: simTime,
			rocketId: rocket.id,
			type: 'MissionStarted',
			message: `Mission started. ${rocket.totalCalls} service calls to complete across ${MISSION.stages.length} stages.`
		});

		return rocket;
	});
}
