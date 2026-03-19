import type { ExecutionStrategy, FailureType, RocketSimulation, SimulationEvent } from '../types';
import { TIMING } from '../../constants';

/**
 * Temporal Durable Execution Strategy
 *
 * - Infinite retries with exponential backoff (150ms → 300ms → 600ms → ... → 5s cap, demo-tuned)
 * - Full state preservation: resumes from exact failure point
 * - Workflow history tracks every event (mimics Temporal Web UI)
 */
export const temporalStrategy: ExecutionStrategy = {
	type: 'temporal',

	onFailure(rocket: RocketSimulation, failureType: FailureType, simTime: number): RocketSimulation {
		rocket.state = 'retrying';
		rocket.retryCount++;
		rocket.totalRetries++;

		// Exponential backoff with cap
		const interval = Math.min(
			TIMING.TEMPORAL_INITIAL_INTERVAL * Math.pow(TIMING.TEMPORAL_BACKOFF_COEFFICIENT, rocket.retryCount - 1),
			TIMING.TEMPORAL_MAX_INTERVAL
		);
		rocket.currentBackoffMs = interval;
		rocket.backoffTimerRemaining = interval;

		// Add workflow history events
		const currentStage = rocket.stageResults[rocket.currentStageIndex];
		const currentGroup = currentStage?.[rocket.currentGroupIndex];
		const currentCall = currentGroup?.callResults[rocket.currentCallIndex];

		rocket.workflowHistory.push({
			eventId: rocket.workflowHistory.length + 1,
			eventType: 'ActivityTaskFailed',
			timestamp: simTime,
			attributes: {
				activityType: currentCall?.callId ?? 'unknown',
				failure: failureType,
				attempt: rocket.retryCount
			}
		});

		// Add to event log
		rocket.eventLog.push(this.logEvent(rocket, 'ActivityTaskFailed', {
			failureType,
			attempt: rocket.retryCount,
			nextRetryIn: `${(interval / 1000).toFixed(1)}s`
		}));

		return rocket;
	},

	shouldRetry(_rocket: RocketSimulation): boolean {
		return true; // Always retry — this is the entire point of durable execution
	},

	getRetryDelay(rocket: RocketSimulation): number {
		return rocket.currentBackoffMs;
	},

	logEvent(rocket: RocketSimulation, eventType: string, detail?: Record<string, unknown>): SimulationEvent {
		return {
			timestamp: Date.now(),
			rocketId: 'temporal',
			type: eventType,
			message: formatTemporalEvent(eventType, detail),
			detail
		};
	}
};

function formatTemporalEvent(eventType: string, detail?: Record<string, unknown>): string {
	switch (eventType) {
		case 'WorkflowExecutionStarted':
			return 'WorkflowExecutionStarted { workflowType: "RocketMission" }';
		case 'ActivityTaskScheduled':
			return `ActivityTaskScheduled { activityType: "${detail?.activityType}" }`;
		case 'ActivityTaskStarted':
			return `ActivityTaskStarted { attempt: ${detail?.attempt} }`;
		case 'ActivityTaskCompleted':
			return `ActivityTaskCompleted { result: "OK" }`;
		case 'ActivityTaskFailed':
			return `ActivityTaskFailed { failure: "${detail?.failureType}", attempt: ${detail?.attempt} }`;
		case 'WorkflowExecutionCompleted':
			return 'WorkflowExecutionCompleted { result: "Mission Complete" }';
		default:
			return eventType;
	}
}
