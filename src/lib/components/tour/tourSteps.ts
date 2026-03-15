export interface TourStep {
	title: string;
	description: string;
	/** CSS selector to highlight, or null for full-screen overlay */
	highlight: string | null;
	/** Position of the tooltip relative to the highlight */
	position: 'top' | 'bottom' | 'left' | 'right' | 'center';
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
	| { type: 'close-code-panel' };

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
		position: 'bottom',
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
		position: 'bottom',
		durationMs: 10000
	},
	{
		title: 'Durable Execution Wins',
		description:
			'The Temporal rocket pauses, waits, and resumes from exactly where it stopped. No data lost, no duplicate calls. Infinite retries with full state preservation — it always completes.',
		highlight: '[data-tour="rocket-lanes"]',
		position: 'bottom',
		durationMs: 8000
	},
	{
		title: 'Total Infrastructure Failure',
		description:
			'Now watch what happens when the entire infrastructure goes down. Every strategy hits a wall — but pay attention to how each one responds.',
		highlight: '[data-tour="infra-toggle"]',
		position: 'top',
		actions: [
			{ type: 'reset' },
			{ type: 'set-availability', value: 100 },
			{ type: 'set-infra-down', value: true },
			{ type: 'launch' }
		],
		durationMs: 18000
	},
	{
		title: 'Manual Intervention Required',
		description:
			'No Retries and Standard Retries are gone. The Event-Driven rocket has exhausted all 8 retries and stalled — a repair ship has been dispatched for manual error queue intervention. Meanwhile, Temporal simply waits with its state fully preserved.',
		highlight: '[data-tour="rocket-lanes"]',
		position: 'bottom',
		durationMs: 10000
	},
	{
		title: 'Recovery',
		description:
			'Infrastructure is back. Temporal resumes instantly from where it left off. The Event-Driven rocket needed manual intervention to recover. That\'s the difference: automatic resilience vs. operational overhead.',
		highlight: '[data-tour="rocket-lanes"]',
		position: 'bottom',
		actions: [{ type: 'set-infra-down', value: false }],
		durationMs: 10000
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
