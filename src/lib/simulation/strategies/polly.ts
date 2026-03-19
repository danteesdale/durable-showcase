import type { ExecutionStrategy, FailureType, RocketSimulation, SimulationEvent } from '../types';
import { TIMING } from '../../constants';

/**
 * Polly / Standard Retry Strategy
 *
 * - Max 3 retries with exponential backoff (300ms × 2.5^n) + ±20% jitter
 * - Circuit breaker after 2 consecutive failures (opens for 10s)
 * - No durable state preservation — if process crashes, progress is lost
 * - Individual call retry (prior calls in stage remembered, but no cross-stage durability)
 */
export const pollyStrategy: ExecutionStrategy = {
	type: 'polly',

	onFailure(rocket: RocketSimulation, failureType: FailureType, _simTime: number): RocketSimulation {
		rocket.retryCount++;
		rocket.totalRetries++;

		if (!this.shouldRetry(rocket)) {
			// Retry budget exhausted — terminal failure
			rocket.state = 'failed';
			rocket.eventLog.push(this.logEvent(rocket, 'RetryExhausted', {
				failureType,
				totalAttempts: rocket.retryCount
			}));
			return rocket;
		}

		rocket.state = 'retrying';

		// Exponential backoff with jitter
		const baseDelay = TIMING.POLLY_INITIAL_INTERVAL * Math.pow(TIMING.POLLY_BACKOFF_FACTOR, rocket.retryCount - 1);
		const jitter = 1 + (Math.random() * 2 - 1) * TIMING.POLLY_JITTER;
		const delay = baseDelay * jitter;

		rocket.currentBackoffMs = delay;
		rocket.backoffTimerRemaining = delay;

		rocket.eventLog.push(this.logEvent(rocket, 'Retry', {
			failureType,
			attempt: rocket.retryCount,
			maxAttempts: TIMING.POLLY_MAX_RETRIES,
			backoff: `${(delay / 1000).toFixed(1)}s`
		}));

		return rocket;
	},

	shouldRetry(rocket: RocketSimulation): boolean {
		return rocket.retryCount < TIMING.POLLY_MAX_RETRIES;
	},

	getRetryDelay(rocket: RocketSimulation): number {
		return rocket.currentBackoffMs;
	},

	logEvent(rocket: RocketSimulation, eventType: string, detail?: Record<string, unknown>): SimulationEvent {
		return {
			timestamp: Date.now(),
			rocketId: 'polly',
			type: eventType,
			message: formatPollyEvent(eventType, detail),
			detail
		};
	}
};

function formatPollyEvent(eventType: string, detail?: Record<string, unknown>): string {
	switch (eventType) {
		case 'CallSuccess':
			return `Call ${detail?.callId} → Success`;
		case 'CallFailed':
			return `Call ${detail?.callId} → Failed (${detail?.failureType})`;
		case 'Retry':
			return `Retry ${detail?.attempt}/${detail?.maxAttempts} (backoff: ${detail?.backoff}) → ${detail?.failureType}`;
		case 'RetryExhausted':
			return `FATAL: Retry budget exhausted after ${detail?.totalAttempts} attempts. No recovery possible.`;
		case 'CircuitBreakerOpen':
			return `Circuit breaker OPEN — too many consecutive failures. Cooling down...`;
		case 'CircuitBreakerClosed':
			return `Circuit breaker CLOSED — resuming calls`;
		default:
			return eventType;
	}
}
