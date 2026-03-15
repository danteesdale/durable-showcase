import type { ExecutionStrategy, FailureType, RocketSimulation, SimulationEvent } from '../types';

/**
 * No-Retry Strategy
 *
 * - Single attempt per call. Any failure is immediately terminal.
 * - No state preservation, no recovery mechanism.
 * - Included as a baseline to show what happens without any resilience.
 */
export const noRetryStrategy: ExecutionStrategy = {
	type: 'no-retry',

	onFailure(rocket: RocketSimulation, failureType: FailureType, _simTime: number): RocketSimulation {
		rocket.state = 'failed';

		const currentStage = rocket.stageResults[rocket.currentStageIndex];
		const currentGroup = currentStage?.[rocket.currentGroupIndex];
		const currentCall = currentGroup?.callResults[rocket.currentCallIndex];

		rocket.eventLog.push(this.logEvent(rocket, 'UnhandledFailure', {
			callId: currentCall?.callId ?? 'unknown',
			failureType,
			stage: rocket.currentStageIndex,
			callsCompleted: rocket.completedCalls,
			totalCalls: rocket.totalCalls
		}));

		return rocket;
	},

	shouldRetry(_rocket: RocketSimulation): boolean {
		return false;
	},

	getRetryDelay(_rocket: RocketSimulation): number {
		return 0;
	},

	logEvent(_rocket: RocketSimulation, eventType: string, detail?: Record<string, unknown>): SimulationEvent {
		return {
			timestamp: Date.now(),
			rocketId: 'no-retry',
			type: eventType,
			message: formatNoRetryEvent(eventType, detail),
			detail
		};
	}
};

function formatNoRetryEvent(eventType: string, detail?: Record<string, unknown>): string {
	switch (eventType) {
		case 'CallSuccess':
			return `Call ${detail?.callId} → Success`;
		case 'UnhandledFailure':
			return `FATAL: ${detail?.callId} → ${detail?.failureType}. No retry policy configured. ${detail?.callsCompleted}/${detail?.totalCalls} calls completed.`;
		default:
			return eventType;
	}
}
