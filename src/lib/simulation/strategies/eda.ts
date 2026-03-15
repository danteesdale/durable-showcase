import type { ExecutionStrategy, FailureType, RocketSimulation, SimulationEvent } from '../types';
import { TIMING } from '../../constants';

/**
 * Event-Driven Architecture Strategy
 *
 * Models a typical message-based saga recoverability pipeline:
 * 1. Immediate retries: 5 attempts with short delay
 * 2. Delayed retries: 3 attempts with increasing delay
 * 3. Error queue: after all retries exhausted, message moves to error queue
 *
 * The saga tracks which stages are complete. When a message goes to the
 * error queue, the saga stalls — it can't proceed until someone manually
 * retries the message (repair ship dispatched after a delay in the sim).
 */
export const edaStrategy: ExecutionStrategy = {
	type: 'eda',

	onFailure(rocket: RocketSimulation, failureType: FailureType, simTime: number): RocketSimulation {
		rocket.totalRetries++;

		const currentStage = rocket.stageResults[rocket.currentStageIndex];
		const currentGroup = currentStage?.[rocket.currentGroupIndex];
		const currentCall = currentGroup?.callResults[rocket.currentCallIndex];
		const callId = currentCall?.callId ?? 'unknown';

		// Phase 1: Immediate retries
		if (rocket.immediateRetriesRemaining > 0) {
			rocket.immediateRetriesRemaining--;
			rocket.retryCount++;
			rocket.state = 'retrying';
			rocket.currentBackoffMs = TIMING.NSERVICEBUS_IMMEDIATE_DELAY;
			rocket.backoffTimerRemaining = TIMING.NSERVICEBUS_IMMEDIATE_DELAY;

			const attemptNum = TIMING.NSERVICEBUS_IMMEDIATE_RETRIES - rocket.immediateRetriesRemaining;
			rocket.eventLog.push(this.logEvent(rocket, 'ImmediateRetry', {
				callId,
				failureType,
				attempt: attemptNum,
				maxAttempts: TIMING.NSERVICEBUS_IMMEDIATE_RETRIES
			}));

			return rocket;
		}

		// Phase 2: Delayed retries
		if (rocket.delayedRetriesRemaining > 0) {
			rocket.delayedRetriesRemaining--;
			rocket.retryCount++;
			rocket.state = 'retrying';

			const delayIndex = TIMING.NSERVICEBUS_DELAYED_RETRIES - rocket.delayedRetriesRemaining - 1;
			const delay = TIMING.NSERVICEBUS_DELAYED_INTERVALS[delayIndex] ?? 30000;
			rocket.currentBackoffMs = delay;
			rocket.backoffTimerRemaining = delay;

			const attemptNum = TIMING.NSERVICEBUS_DELAYED_RETRIES - rocket.delayedRetriesRemaining;
			rocket.eventLog.push(this.logEvent(rocket, 'DelayedRetry', {
				callId,
				failureType,
				attempt: attemptNum,
				maxAttempts: TIMING.NSERVICEBUS_DELAYED_RETRIES,
				delay: `${delay / 1000}s`
			}));

			return rocket;
		}

		// Phase 3: Move to error queue — saga stalls, needs manual intervention
		rocket.state = 'error-queue-stalled';
		rocket.repairTimeRemaining = TIMING.REPAIR_STALL_DURATION;
		rocket.repairShipProgress = 0;
		rocket.errorQueueMessages.push({
			messageId: `msg-${simTime}-${callId}`,
			messageType: `Perform${currentGroup?.groupName.replace(/\s+/g, '') ?? 'Unknown'}`,
			failedAt: simTime,
			retryCount: TIMING.NSERVICEBUS_IMMEDIATE_RETRIES + TIMING.NSERVICEBUS_DELAYED_RETRIES,
			lastError: failureType,
			originalDestination: `${currentGroup?.groupName ?? 'Unknown'}Handler`
		});

		// Update saga state
		const stageName = `stage-${rocket.currentStageIndex}`;
		rocket.sagaState[stageName] = 'failed';

		rocket.eventLog.push(this.logEvent(rocket, 'SentToErrorQueue', {
			callId,
			failureType,
			errorQueueCount: rocket.errorQueueMessages.length
		}));

		rocket.eventLog.push(this.logEvent(rocket, 'SagaStalled', {
			sagaState: { ...rocket.sagaState },
			waitingOn: stageName
		}));

		return rocket;
	},

	shouldRetry(rocket: RocketSimulation): boolean {
		return rocket.immediateRetriesRemaining > 0 || rocket.delayedRetriesRemaining > 0;
	},

	getRetryDelay(rocket: RocketSimulation): number {
		return rocket.currentBackoffMs;
	},

	logEvent(_rocket: RocketSimulation, eventType: string, detail?: Record<string, unknown>): SimulationEvent {
		return {
			timestamp: Date.now(),
			rocketId: 'eda',
			type: eventType,
			message: formatEdaEvent(eventType, detail),
			detail
		};
	}
};

function formatEdaEvent(eventType: string, detail?: Record<string, unknown>): string {
	switch (eventType) {
		case 'MessageDispatched':
			return `MSG ${detail?.messageType} → Dispatched to ${detail?.handler}`;
		case 'HandlerProcessing':
			return `HANDLER ${detail?.handler} → Processing...`;
		case 'CallSuccess':
			return `CALL ${detail?.callId} → Success`;
		case 'CallFailed':
			return `CALL ${detail?.callId} → Failed (${detail?.failureType})`;
		case 'ImmediateRetry':
			return `IMMEDIATE RETRY ${detail?.attempt}/${detail?.maxAttempts} → Failed (${detail?.failureType})`;
		case 'DelayedRetry':
			return `DELAYED RETRY ${detail?.attempt}/${detail?.maxAttempts} (${detail?.delay} delay) → Failed (${detail?.failureType})`;
		case 'SentToErrorQueue':
			return `⚠ MESSAGE MOVED TO ERROR QUEUE → Manual intervention required (${detail?.errorQueueCount} total)`;
		case 'SagaStalled':
			return `SAGA RocketJourneySaga → Stalled (waiting on ${detail?.waitingOn})`;
		default:
			return eventType;
	}
}
