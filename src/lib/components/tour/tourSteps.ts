export interface TourStep {
	title: string;
	description: string;
	/** CSS selector to highlight, or null for full-screen overlay */
	highlight: string | null;
	/** Position of the tour card */
	position: 'top' | 'bottom-left' | 'bottom-center' | 'bottom-right' | 'center';
	/** Automated actions to perform when this step activates */
	actions?: TourAction[];
	/** Delay before auto-advancing to next step (ms) */
	durationMs: number;
}

export type TourAction =
	| { type: 'set-availability'; value: number }
	| { type: 'set-network-failure'; value: number }
	| { type: 'set-infra-down'; value: boolean }
	| { type: 'launch' }
	| { type: 'reset' }
	| { type: 'open-code-panel' }
	| { type: 'close-code-panel' }
	/** Toggle infra on/off on a schedule. Each entry is [delayMs, infraDown]. */
	| { type: 'infra-schedule'; schedule: Array<[number, boolean]> };

export const tourSteps: TourStep[] = [
	{
		title: 'The Distributed Systems Challenge',
		description:
			'In distributed systems, a single request can touch hundreds of services. This mission simulates 250 service calls across 6 stages. What happens when things go wrong?',
		highlight: null,
		position: 'center',
		durationMs: 8000
	},
	{
		title: 'Four Strategies, One Mission',
		description:
			'Four identical rocket missions, each using a different strategy for handling failure. Same business logic, different resilience approaches.',
		highlight: '[data-tour="rocket-lanes"]',
		position: 'center',
		durationMs: 8000
	},
	{
		title: 'Failure Controls',
		description:
			'These controls simulate real infrastructure problems: service degradation, rate limits, and network failures. You can also unleash the Chaos Space Monkey for automated chaos.',
		highlight: '[data-tour="controls"]',
		position: 'top',
		durationMs: 8000
	},
	{
		title: 'The Happy Path',
		description:
			'When everything works, all four strategies succeed. But that\'s not the real world.',
		highlight: '[data-tour="launch-btn"]',
		position: 'top',
		actions: [
			{ type: 'reset' },
			{ type: 'set-availability', value: 100 },
			{ type: 'set-network-failure', value: 0 },
			{ type: 'set-infra-down', value: false },
			{ type: 'launch' }
		],
		durationMs: 12000
	},
	{
		title: 'Real-World Conditions',
		description:
			'Services aren\'t 100% reliable. At 75% per-call availability with 250 calls, even strategies with retries are under serious pressure. Watch what happens.',
		highlight: '[data-tour="availability"]',
		position: 'top',
		actions: [
			{ type: 'reset' },
			{ type: 'set-availability', value: 75 },
			{ type: 'launch' }
		],
		durationMs: 18000
	},
	{
		title: 'The Failures Stack Up',
		description:
			'No Retries explodes on the first failure. Standard Retries burns through its 3 attempts quickly and crashes. Event-Driven has more retries but can still exhaust them — and when it does, messages land in an error queue. Only Temporal keeps going.',
		highlight: '[data-tour="rocket-lanes"]',
		position: 'bottom-left',
		durationMs: 10000
	},
	{
		title: 'Durable Execution Wins',
		description:
			'The Temporal rocket pauses, waits, and resumes from exactly where it stopped. No data lost, no duplicate calls. Infinite retries with full state preservation — it always completes.',
		highlight: '[data-tour="rocket-lanes"]',
		position: 'bottom-left',
		durationMs: 8000
	},
	{
		title: 'Infrastructure Goes Down',
		description:
			'Infrastructure just went down completely. No Retries and Standard Retries are immediately eliminated. The Event-Driven rocket is burning through its retry budget. Temporal calmly pauses and waits.',
		highlight: '[data-tour="infra-toggle"]',
		position: 'top',
		actions: [
			{ type: 'reset' },
			// 100% availability — infra-down overrides anyway, and when it comes back
			// Temporal gets a clean runway with zero call failures
			{ type: 'set-availability', value: 100 },
			{ type: 'set-infra-down', value: true },
			{ type: 'launch' },
			// EDA exhausts 8 retries in ~4s, then 7s stall before repair ship dispatched
			// Bring infra back at 8s — Temporal backoff is still small (~1-2s), resumes quickly
			// EDA is mid-stall, repair ship hasn't even arrived yet
			{ type: 'infra-schedule', schedule: [
				[8000, false],
			]},
		],
		durationMs: 15000
	},
	{
		title: 'Infrastructure Recovers',
		description:
			'Infrastructure is back. Watch the difference: Temporal resumes instantly and races ahead. The Event-Driven rocket is still stuck — waiting for a repair ship to arrive, dock, inspect the error queue, and manually retry the failed messages.',
		highlight: '[data-tour="rocket-lanes"]',
		position: 'bottom-center',
		durationMs: 18000
	},
	{
		title: 'The Code Tells the Story',
		description:
			'Both Temporal and Event-Driven need activity/handler code to do the actual work. The difference? Temporal keeps your orchestration as linear business logic in one file. Event-Driven scatters it across sagas, handlers, message classes, and config — ~300 lines of infrastructure code on top of your business logic.',
		highlight: null,
		position: 'center',
		actions: [{ type: 'open-code-panel' }],
		durationMs: 12000
	},
	{
		title: 'This is Durable Execution',
		description:
			'Your workflow code is just business logic — readable, testable, and linear. Temporal handles retries, state preservation, and fault tolerance automatically, so you can focus on what matters.',
		highlight: null,
		position: 'center',
		actions: [{ type: 'close-code-panel' }],
		durationMs: 10000
	}
];
