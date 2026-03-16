import type { StrategyType } from '$lib/simulation/types';

export interface CodeFile {
	filename: string;
	language: string;
	code: string;
}

export interface CodeSnippet {
	title: string;
	files: CodeFile[];
	complexity: string;
	summary: string;
}

export const codeSnippets: Record<StrategyType, CodeSnippet> = {
	'no-retry': {
		title: 'No Error Handling',
		files: [
			{
				filename: 'mission.ts',
				language: 'typescript',
				code: `export async function rocketMission(missionId: string) {
  const engine = await engineService.start(missionId);
  await fuelSystem.pressurize(engine.id);
  await safety.verifyAllClear(missionId);

  await launchControl.authorize(missionId);
  await tower.retractArm(missionId);
  await propulsion.mainEngineStart(engine.id);
  await telemetry.initDownlink(missionId);

  await guidance.activateFCS(missionId);
  await aerodynamics.monitorHeatShield(missionId);
  await comms.activateSBand(missionId);

  await navigation.calculateBurn(missionId);
  await propulsion.executeManeuver(missionId);

  await orbital.calculateInsertion(missionId);
  await rcs.enableStationKeeping(missionId);

  await dockingPort.extendMechanism(missionId);
  await rcs.finalApproach(missionId);
  await dockingPort.confirmCapture(missionId);
}

// Simple. Linear. Easy to read.
// But any single failure across 250 calls = crash.
// No retries. No recovery. No durability.`
			}
		],
		complexity: 'Minimal',
		summary: 'The simplest approach — and the same linear structure Temporal preserves. No retries, no recovery, no durability. One failure across 250 calls and the mission is over. Compare this to Temporal\'s workflow: nearly identical code, completely different resilience.'
	},

	polly: {
		title: 'Standard Retry Pattern',
		files: [
			{
				filename: 'mission.ts',
				language: 'typescript',
				code: `import { retry, exponentialBackoff } from './resilience';

const policy = retry({
  maxAttempts: 3,
  backoff: exponentialBackoff({
    initial: 300, factor: 2.5, jitter: 0.2
  })
});

export async function rocketMission(missionId: string) {
  const engine = await policy.execute(
    () => engineService.start(missionId));
  await policy.execute(
    () => fuelSystem.pressurize(engine.id));
  await policy.execute(
    () => safety.verifyAllClear(missionId));

  await policy.execute(
    () => launchControl.authorize(missionId));
  await policy.execute(
    () => tower.retractArm(missionId));
  // ... every call wrapped in policy.execute()

  await policy.execute(
    () => dockingPort.confirmCapture(missionId));
}

// Still linear and readable, but:
// - If retries exhaust? Total failure, start over.
// - If the process crashes between calls?
//   All progress lost. No state preservation.
// - If ignition() succeeded but we crash before
//   recording it? Duplicate side effects on restart.`
			}
		],
		complexity: 'Low',
		summary: 'Adds retry wrappers around the same linear flow. Handles transient blips well — but unlike Temporal, there\'s no state preservation. If retries exhaust or the process crashes, all progress is lost. No way to resume from where you left off.'
	},

	temporal: {
		title: 'Temporal Durable Execution',
		files: [
			{
				filename: 'workflow.ts',
				language: 'typescript',
				code: `import { proxyActivities } from '@temporalio/workflow';
import type * as activities from './activities';

const act = proxyActivities<typeof activities>({
  startToCloseTimeout: '30s',
  retry: {
    initialInterval: '1s',
    backoffCoefficient: 2,
    maximumAttempts: Infinity,
    maximumInterval: '30s',
  },
});

export async function rocketMission(missionId: string) {
  // Ignition
  const engine = await act.startEngine(missionId);
  await act.pressurizeFuel(engine.id);
  await act.verifyAllClear(missionId);

  // Launch
  await act.authorizeLaunch(missionId);
  await act.retractArm(missionId);
  await act.mainEngineStart(missionId);
  await act.initDownlink(missionId);

  // Atmospheric Exit
  await act.activateFCS(missionId);
  await act.monitorHeatShield(missionId);
  await act.activateSBand(missionId);

  // Deep Space Navigation
  await act.calculateBurn(missionId);
  await act.executeManeuver(missionId);

  // Orbital Insertion
  await act.calculateInsertion(missionId);
  await act.enableStationKeeping(missionId);

  // Docking
  await act.extendMechanism(missionId);
  await act.finalApproach(missionId);
  await act.confirmCapture(missionId);
}

// Each activity is one operation — the unit of retry.
// If monitorHeatShield() fails, only that call retries.
// Retries, state, timeouts — handled by the platform.`
			},
			{
				filename: 'worker.ts',
				language: 'typescript',
				code: `import { Worker, NativeConnection } from '@temporalio/worker';
import * as activities from './activities';

const connection = await NativeConnection.connect({
  address: 'temporal:7233',
});

const worker = await Worker.create({
  connection,
  namespace: 'default',
  taskQueue: 'rocket-missions',
  workflowsPath: require.resolve('./workflow'),
  activities,
});

await worker.run();`
			},
			{
				filename: 'activities.ts',
				language: 'typescript',
				code: `// Each activity wraps one operation.
// Plain async functions — no orchestration logic,
// no message routing, no saga state.

// Ignition
export async function startEngine(id: string) {
  return await engineService.start(id);
}
export async function pressurizeFuel(engineId: string) {
  await fuelSystem.pressurize(engineId);
}
export async function verifyAllClear(id: string) {
  await safety.verifyAllClear(id);
}

// Launch
export async function authorizeLaunch(id: string) {
  await launchControl.authorize(id);
}
export async function retractArm(id: string) {
  await tower.retractArm(id);
}
export async function mainEngineStart(id: string) {
  await propulsion.mainEngineStart(id);
}
export async function initDownlink(id: string) {
  await telemetry.initDownlink(id);
}

// Atmospheric Exit
export async function activateFCS(id: string) {
  await guidance.activateFCS(id);
}
export async function monitorHeatShield(id: string) {
  await aerodynamics.monitorHeatShield(id);
}
export async function activateSBand(id: string) {
  await comms.activateSBand(id);
}

// Deep Space Navigation
export async function calculateBurn(id: string) {
  await navigation.calculateBurn(id);
}
export async function executeManeuver(id: string) {
  await propulsion.executeManeuver(id);
}

// Orbital Insertion
export async function calculateInsertion(id: string) {
  await orbital.calculateInsertion(id);
}
export async function enableStationKeeping(id: string) {
  await rcs.enableStationKeeping(id);
}

// Docking
export async function extendMechanism(id: string) {
  await dockingPort.extendMechanism(id);
}
export async function finalApproach(id: string) {
  await rcs.finalApproach(id);
}
export async function confirmCapture(id: string) {
  await dockingPort.confirmCapture(id);
}`
			}
		],
		complexity: 'Medium',
		summary: 'The workflow reads like the no-retry version — but with full durability. Activities make the same API calls as EDA handlers, but without message routing or saga state. The orchestration stays in one file instead of being scattered across 20+. The tradeoff: you need a Temporal cluster running.'
	},

	eda: {
		title: 'Event-Driven Saga (NServiceBus)',
		files: [
			{
				filename: 'RocketJourneySaga.cs',
				language: 'csharp',
				code: `public class RocketJourneySaga :
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
        mapper.MapSaga(s => s.MissionId)
              .ToMessage<IgnitionCompleted>(m => m.MissionId);
        mapper.MapSaga(s => s.MissionId)
              .ToMessage<LaunchCompleted>(m => m.MissionId);
        mapper.MapSaga(s => s.MissionId)
              .ToMessage<AtmoExitCompleted>(m => m.MissionId);
        mapper.MapSaga(s => s.MissionId)
              .ToMessage<NavCompleted>(m => m.MissionId);
        mapper.MapSaga(s => s.MissionId)
              .ToMessage<OrbitalCompleted>(m => m.MissionId);
        mapper.MapSaga(s => s.MissionId)
              .ToMessage<DockingCompleted>(m => m.MissionId);
    }

    public async Task Handle(
        StartMission msg, IMessageHandlerContext ctx)
    {
        Data.MissionId = msg.MissionId;
        Data.StartedAt = DateTime.UtcNow;
        await ctx.Send(new PerformIgnition {
            MissionId = Data.MissionId });
    }

    public async Task Handle(
        IgnitionCompleted msg, IMessageHandlerContext ctx)
    {
        Data.IgnitionDone = true;
        await ctx.Send(new PerformLaunch {
            MissionId = Data.MissionId });
    }

    public async Task Handle(
        LaunchCompleted msg, IMessageHandlerContext ctx)
    {
        Data.LaunchDone = true;
        await ctx.Send(new PerformAtmoExit {
            MissionId = Data.MissionId });
    }

    public async Task Handle(
        AtmoExitCompleted msg, IMessageHandlerContext ctx)
    {
        Data.AtmoExitDone = true;
        await ctx.Send(new PerformDeepSpaceNav {
            MissionId = Data.MissionId });
    }

    public async Task Handle(
        NavCompleted msg, IMessageHandlerContext ctx)
    {
        Data.NavDone = true;
        await ctx.Send(new PerformOrbitalInsertion {
            MissionId = Data.MissionId });
    }

    public async Task Handle(
        OrbitalCompleted msg, IMessageHandlerContext ctx)
    {
        Data.OrbitalDone = true;
        await ctx.Send(new PerformDocking {
            MissionId = Data.MissionId });
    }

    public async Task Handle(
        DockingCompleted msg, IMessageHandlerContext ctx)
    {
        Data.DockingDone = true;
        Data.CompletedAt = DateTime.UtcNow;
        MarkAsComplete();
    }
}`
			},
			{
				filename: 'IgnitionHandler.cs',
				language: 'csharp',
				code: `public class IgnitionHandler :
    IHandleMessages<PerformIgnition>
{
    public async Task Handle(
        PerformIgnition msg,
        IMessageHandlerContext ctx)
    {
        var engine = await engineService
            .Start(msg.MissionId);
        await fuelSystem.Pressurize(engine.Id);
        await safety.VerifyAllClear(msg.MissionId);

        await ctx.Publish(new IgnitionCompleted {
            MissionId = msg.MissionId });
    }
}`
			},
			{
				filename: 'LaunchHandler.cs',
				language: 'csharp',
				code: `public class LaunchHandler :
    IHandleMessages<PerformLaunch>
{
    public async Task Handle(
        PerformLaunch msg,
        IMessageHandlerContext ctx)
    {
        await launchControl.Authorize(msg.MissionId);
        await tower.RetractArm(msg.MissionId);
        await propulsion.MainEngineStart(msg.MissionId);
        await telemetry.InitDownlink(msg.MissionId);

        await ctx.Publish(new LaunchCompleted {
            MissionId = msg.MissionId });
    }
}`
			},
			{
				filename: 'AtmoExitHandler.cs',
				language: 'csharp',
				code: `public class AtmoExitHandler :
    IHandleMessages<PerformAtmoExit>
{
    public async Task Handle(
        PerformAtmoExit msg,
        IMessageHandlerContext ctx)
    {
        await guidance.ActivateFCS(msg.MissionId);
        await aerodynamics.MonitorHeatShield(
            msg.MissionId);
        await comms.ActivateSBand(msg.MissionId);

        await ctx.Publish(new AtmoExitCompleted {
            MissionId = msg.MissionId });
    }
}`
			},
			{
				filename: 'DeepSpaceNavHandler.cs',
				language: 'csharp',
				code: `public class DeepSpaceNavHandler :
    IHandleMessages<PerformNav>
{
    public async Task Handle(
        PerformNav msg,
        IMessageHandlerContext ctx)
    {
        await navigation.CalculateBurn(msg.MissionId);
        await propulsion.ExecuteManeuver(
            msg.MissionId);

        await ctx.Publish(new NavCompleted {
            MissionId = msg.MissionId });
    }
}`
			},
			{
				filename: 'OrbitalHandler.cs',
				language: 'csharp',
				code: `public class OrbitalHandler :
    IHandleMessages<PerformOrbitalInsertion>
{
    public async Task Handle(
        PerformOrbitalInsertion msg,
        IMessageHandlerContext ctx)
    {
        await orbital.CalculateInsertion(
            msg.MissionId);
        await rcs.EnableStationKeeping(msg.MissionId);

        await ctx.Publish(new OrbitalCompleted {
            MissionId = msg.MissionId });
    }
}`
			},
			{
				filename: 'DockingHandler.cs',
				language: 'csharp',
				code: `public class DockingHandler :
    IHandleMessages<PerformDocking>
{
    public async Task Handle(
        PerformDocking msg,
        IMessageHandlerContext ctx)
    {
        await dockingPort.ExtendMechanism(
            msg.MissionId);
        await rcs.FinalApproach(msg.MissionId);
        await dockingPort.ConfirmCapture(
            msg.MissionId);

        await ctx.Publish(new DockingCompleted {
            MissionId = msg.MissionId });
    }
}`
			},
			{
				filename: 'Messages.cs',
				language: 'csharp',
				code: `// Commands (what to do)
public class PerformIgnition {
    public string MissionId { get; set; }
}
public class PerformLaunch {
    public string MissionId { get; set; }
}
public class PerformAtmoExit {
    public string MissionId { get; set; }
}
public class PerformNav {
    public string MissionId { get; set; }
}
public class PerformOrbitalInsertion {
    public string MissionId { get; set; }
}
public class PerformDocking {
    public string MissionId { get; set; }
}

// Events (what happened)
public class IgnitionCompleted {
    public string MissionId { get; set; }
}
public class LaunchCompleted {
    public string MissionId { get; set; }
}
public class AtmoExitCompleted {
    public string MissionId { get; set; }
}
public class NavCompleted {
    public string MissionId { get; set; }
}
public class OrbitalCompleted {
    public string MissionId { get; set; }
}
public class DockingCompleted {
    public string MissionId { get; set; }
}`
			},
			{
				filename: 'EndpointConfig.cs',
				language: 'csharp',
				code: `var endpointConfig =
    new EndpointConfiguration("RocketWorker");

var transport = endpointConfig
    .UseTransport<RabbitMQTransport>();
transport.ConnectionString("host=rabbitmq");

var routing = transport.Routing();
routing.RouteToEndpoint(
    typeof(PerformIgnition), "RocketWorker");
routing.RouteToEndpoint(
    typeof(PerformLaunch), "RocketWorker");
routing.RouteToEndpoint(
    typeof(PerformAtmoExit), "RocketWorker");
routing.RouteToEndpoint(
    typeof(PerformNav), "RocketWorker");
routing.RouteToEndpoint(
    typeof(PerformOrbitalInsertion), "RocketWorker");
routing.RouteToEndpoint(
    typeof(PerformDocking), "RocketWorker");

var persistence = endpointConfig
    .UsePersistence<SqlPersistence>();
persistence.ConnectionBuilder(() =>
    new SqlConnection(connectionString));`
			},
			{
				filename: 'Recoverability.cs',
				language: 'csharp',
				code: `var recoverability =
    endpointConfig.Recoverability();

recoverability.Immediate(
    i => i.NumberOfRetries(5));

recoverability.Delayed(d => {
    d.NumberOfRetries(3);
    d.TimeIncrease(
        TimeSpan.FromSeconds(10));
});

// After 8 total retries:
// Message moves to the error queue.
// Requires manual review and retry
// via error management tooling.`
			}
		],
		complexity: 'High',
		summary: 'The handlers make the same API calls as Temporal activities — but each one must also know what message to publish next. The orchestration that Temporal keeps in a single workflow file is scattered across the saga, handlers, message contracts, and routing config. To trace the mission flow, you hop between files following messages. Both approaches give you durability — but EDA pays for it with distributed complexity.'
	}
};
