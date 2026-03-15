import type { CallAttemptResult, FailureConfig } from './types';

// ============================================================
// Seeded PRNG (Mulberry32)
// Each rocket gets its own seed so they don't fail simultaneously
// ============================================================

export class SeededRandom {
	private state: number;

	constructor(seed: number) {
		this.state = seed;
	}

	/** Returns a random float in [0, 1) */
	next(): number {
		this.state |= 0;
		this.state = (this.state + 0x6d2b79f5) | 0;
		let t = Math.imul(this.state ^ (this.state >>> 15), 1 | this.state);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	}

	/** Returns a random float in [min, max) */
	range(min: number, max: number): number {
		return min + this.next() * (max - min);
	}

	/** Returns a random integer in [min, max] (inclusive) */
	int(min: number, max: number): number {
		return Math.floor(this.range(min, max + 1));
	}
}

// ============================================================
// Rate Limiter (per-rocket token bucket)
// ============================================================

export class RateLimiter {
	private tokens: number;
	private lastRefill: number;
	private burstSize: number;

	constructor(burstSize: number) {
		this.burstSize = burstSize;
		this.tokens = burstSize;
		this.lastRefill = 0;
	}

	/** Try to consume a token. Returns false if rate limited. */
	tryConsume(simTime: number): boolean {
		// Refill 1 token per second of sim time
		const elapsed = simTime - this.lastRefill;
		if (elapsed > 1000) {
			const refill = Math.floor(elapsed / 1000);
			this.tokens = Math.min(this.burstSize, this.tokens + refill);
			this.lastRefill = simTime;
		}

		if (this.tokens > 0) {
			this.tokens--;
			return true;
		}
		return false;
	}

	reset(burstSize: number): void {
		this.burstSize = burstSize;
		this.tokens = burstSize;
		this.lastRefill = 0;
	}
}

// ============================================================
// Failure Injection
// ============================================================

/**
 * Determine if a service call succeeds or fails based on the current failure config.
 * Uses the rocket's seeded PRNG for deterministic-per-rocket randomness.
 */
export function attemptServiceCall(
	rng: SeededRandom,
	config: FailureConfig,
	rateLimiter: RateLimiter,
	simTime: number
): CallAttemptResult {
	// 1. Infrastructure down overrides everything
	if (config.infrastructureDown) {
		return { success: false, failureType: 'infrastructure-down' };
	}

	// 2. Network failure (independent probability)
	if (config.networkFailureRate > 0) {
		const roll = rng.next() * 100;
		if (roll < config.networkFailureRate) {
			return { success: false, failureType: 'network-timeout' };
		}
	}

	// 3. Rate limiting
	if (config.rateLimitEnabled) {
		if (!rateLimiter.tryConsume(simTime)) {
			return { success: false, failureType: 'rate-limited' };
		}
	}

	// 4. Service availability
	if (config.serviceAvailability < 100) {
		const roll = rng.next() * 100;
		if (roll >= config.serviceAvailability) {
			return { success: false, failureType: 'service-down' };
		}
	}

	// 5. Success
	return { success: true };
}
