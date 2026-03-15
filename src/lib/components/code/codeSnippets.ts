import type { StrategyType } from '$lib/simulation/types';

export interface CodeSnippet {
	title: string;
	language: string;
	code: string;
	lineCount: number;
	fileCount: number;
	summary: string;
}

export const codeSnippets: Record<StrategyType, CodeSnippet> = {
	temporal: {
		title: 'Temporal Workflow',
		language: 'typescript',
		code: `// workflow.ts
import { proxyActivities, log } from '@temporalio/workflow';
import type * as activities from './activities';

const { ignition, launch, atmosphericExit,
        deepSpaceNav, orbitalInsertion, docking
} = proxyActivities<typeof activities>({
  startToCloseTimeout: '30 seconds',
  retry: {
    initialInterval: '1s',
    backoffCoefficient: 2,
    maximumAttempts: Infinity,   // retry forever
    maximumInterval: '30s',
  },
});

export async function rocketMission(
  missionId: string
): Promise<string> {
  log.info('Mission started', { missionId });

  await ignition(missionId);
  await launch(missionId);
  await atmosphericExit(missionId);
  await deepSpaceNav(missionId);
  await orbitalInsertion(missionId);
  await docking(missionId);

  return \`Mission \${missionId} complete\`;
}

// That's it. Retries, state preservation, timeouts —
// all handled by the platform. If the process crashes
// mid-flight, Temporal replays the workflow history
// and resumes from the exact point of failure.
// No data lost. No duplicate side effects.`,
		lineCount: 24,
		fileCount: 2,
		summary: 'Your workflow reads like a script — linear business logic in one file. Activities are plain async functions (same work as EDA handlers). Temporal handles orchestration, retries, and state automatically.'
	},

	polly: {
		title: 'Standard Retry Pattern',
		language: 'typescript',
		code: `import { retry, exponentialBackoff } from './resilience';

const policy = retry({
  maxAttempts: 3,
  backoff: exponentialBackoff({
    initial: 1000,
    factor: 2.5,
    jitter: 0.2
  })
});

export async function rocketMission(): Promise<void> {
  // No state preservation — if the process crashes,
  // all progress is lost and we start from scratch.
  await policy.execute(() => ignition());
  await policy.execute(() => launch());
  await policy.execute(() => atmosphericExit());
  await policy.execute(() => deepSpaceNavigation());
  await policy.execute(() => orbitalInsertion());
  await policy.execute(() => docking());

  // What if the process crashes between step 3 and 4?
  // What if step 4 fails after retries are exhausted?
  // Answer: all progress lost, start over from scratch.

  // What about duplicate side effects on retry?
  // If ignition() succeeds but launch() fails, retrying
  // launch() is fine — but what if the crash happens
  // AFTER ignition() ran but BEFORE we recorded it?
}`,
		lineCount: 30,
		fileCount: 1,
		summary: 'Each call is wrapped individually. No state preservation across process boundaries. Retry exhaustion = total failure.'
	},

	'no-retry': {
		title: 'No Error Handling',
		language: 'typescript',
		code: `export async function rocketMission(): Promise<void> {
  await ignition();
  await launch();
  await atmosphericExit();
  await deepSpaceNavigation();
  await orbitalInsertion();
  await docking();
  // No error handling. No retries.
  // Any failure = unhandled exception = crash.
  // Hope nothing goes wrong across 250 service calls.
}`,
		lineCount: 11,
		fileCount: 1,
		summary: 'The "happy path only" approach. Works until it doesn\'t — and with 250 calls, it almost certainly doesn\'t.'
	},

	eda: {
		title: 'Event-Driven Saga',
		language: 'csharp',
		code: `// RocketJourneySaga.cs
public class RocketJourneySaga :
    Saga<RocketJourneyData>,
    IAmStartedBy<StartMission>,
    IHandleMessages<IgnitionCompleted>,
    IHandleMessages<LaunchCompleted>,
    IHandleMessages<AtmoExitCompleted>,
    IHandleMessages<NavCompleted>,
    IHandleMessages<OrbitalCompleted>,
    IHandleMessages<DockingCompleted>
{
    protected override void ConfigureHowToFindSaga(
        SagaPropertyMapper<RocketJourneyData> mapper)
    {
        mapper.MapSaga(s => s.MissionId)
              .ToMessage<StartMission>(m => m.MissionId);
        // ... 6 more mappings
    }

    public async Task Handle(
        StartMission msg, IMessageHandlerContext ctx)
    {
        Data.MissionId = msg.MissionId;
        await ctx.Send(new PerformIgnition {
            MissionId = Data.MissionId
        });
    }

    public async Task Handle(
        IgnitionCompleted msg, IMessageHandlerContext ctx)
    {
        Data.IgnitionDone = true;
        await ctx.Send(new PerformLaunch {
            MissionId = Data.MissionId
        });
    }

    // ... 5 more handlers, each sending the next
}

// + IgnitionHandler.cs        (25 lines)
// + LaunchHandler.cs           (30 lines)
// + AtmoExitHandler.cs         (35 lines)
// + DeepSpaceNavHandler.cs     (30 lines)
// + OrbitalInsertionHandler.cs (35 lines)
// + DockingHandler.cs          (25 lines)
// + 12 message class files
// + EndpointConfiguration.cs   (40 lines)
// + RecoverabilityConfig.cs    (20 lines)

// Total: ~350 lines across 20+ files
// And if something goes to the error queue?
// Open monitoring tool, inspect, manually retry.`,
		lineCount: 350,
		fileCount: 20,
		summary: 'Messages are durable and handlers do the same work as Temporal activities — but the orchestration logic (saga coordination, message routing, error queue config) adds ~300 lines of infrastructure code across 20+ files.'
	}
};
