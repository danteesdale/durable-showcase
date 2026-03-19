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
				filename: 'Mission.cs',
				language: 'csharp',
				code: `public class RocketMission
{
    public async Task Execute(string missionId)
    {
        var engine = await _engineService
            .Start(missionId);
        await _fuelSystem.Pressurize(engine.Id);
        await _safety.VerifyAllClear(missionId);

        await _launchControl.Authorize(missionId);
        await _tower.RetractArm(missionId);
        await _propulsion.MainEngineStart(engine.Id);
        await _telemetry.InitDownlink(missionId);

        await _guidance.ActivateFCS(missionId);
        await _aerodynamics.MonitorHeatShield(missionId);
        await _comms.ActivateSBand(missionId);

        await _navigation.CalculateBurn(missionId);
        await _propulsion.ExecuteManeuver(missionId);

        await _orbital.CalculateInsertion(missionId);
        await _rcs.EnableStationKeeping(missionId);

        await _dockingPort.ExtendMechanism(missionId);
        await _rcs.FinalApproach(missionId);
        await _dockingPort.ConfirmCapture(missionId);
    }
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
				filename: 'Mission.cs',
				language: 'csharp',
				code: `public class RocketMission(ResiliencePipeline policy)
{
    public async Task Execute(string missionId)
    {
        var engine = await policy.ExecuteAsync(
            async ct => await _engineService.Start(missionId, ct));
        await policy.ExecuteAsync(
            async ct => await _fuelSystem.Pressurize(engine.Id, ct));
        await policy.ExecuteAsync(
            async ct => await _safety.VerifyAllClear(missionId, ct));

        await policy.ExecuteAsync(
            async ct => await _launchControl.Authorize(missionId, ct));
        await policy.ExecuteAsync(
            async ct => await _tower.RetractArm(missionId, ct));
        await policy.ExecuteAsync(
            async ct => await _propulsion.MainEngineStart(missionId, ct));
        await policy.ExecuteAsync(
            async ct => await _telemetry.InitDownlink(missionId, ct));

        await policy.ExecuteAsync(
            async ct => await _guidance.ActivateFCS(missionId, ct));
        await policy.ExecuteAsync(
            async ct => await _aerodynamics.MonitorHeatShield(missionId, ct));
        await policy.ExecuteAsync(
            async ct => await _comms.ActivateSBand(missionId, ct));

        await policy.ExecuteAsync(
            async ct => await _navigation.CalculateBurn(missionId, ct));
        await policy.ExecuteAsync(
            async ct => await _propulsion.ExecuteManeuver(missionId, ct));

        await policy.ExecuteAsync(
            async ct => await _orbital.CalculateInsertion(missionId, ct));
        await policy.ExecuteAsync(
            async ct => await _rcs.EnableStationKeeping(missionId, ct));

        await policy.ExecuteAsync(
            async ct => await _dockingPort.ExtendMechanism(missionId, ct));
        await policy.ExecuteAsync(
            async ct => await _rcs.FinalApproach(missionId, ct));
        await policy.ExecuteAsync(
            async ct => await _dockingPort.ConfirmCapture(missionId, ct));
    }
}

// Still linear and readable, but:
// - If retries exhaust? Total failure, start over.
// - If the process crashes between calls?
//   All progress lost. No state preservation.
// - If Start() succeeded but we crash before
//   recording it? Duplicate side effects on restart.`
			},
			{
				filename: 'ResiliencePolicy.cs',
				language: 'csharp',
				code: `using Polly;
using Polly.Retry;

public static ResiliencePipeline Build() =>
    new ResiliencePipelineBuilder()
        .AddRetry(new RetryStrategyOptions
        {
            MaxRetryAttempts = 3,
            BackoffType = DelayBackoffType.Exponential,
            Delay = TimeSpan.FromMilliseconds(300),
            UseJitter = true, // DecorrelatedJitterBackoffV2
            OnRetry = args =>
            {
                Console.WriteLine(
                    $"Retry {args.AttemptNumber}" +
                    $" after {args.RetryDelay}");
                return ValueTask.CompletedTask;
            }
        })
        .Build();`
			},
			{
				filename: 'Worker.cs',
				language: 'csharp',
				code: `
var policy = ResiliencePolicy.Build();
var mission = new RocketMission(policy);
var missionId = Environment
    .GetEnvironmentVariable("MISSION_ID")!;

try
{
    await mission.Execute(missionId);
}
catch (Exception ex)
{
    Console.Error.WriteLine(
        $"Mission failed — no recovery possible: " +
        $"{ex.Message}");
    Environment.Exit(1);
}`
			}
		],
		complexity: 'Low',
		summary: 'Adds retry wrappers around the same linear flow using Polly v8. Handles transient blips well — but unlike Temporal, there\'s no state preservation. If retries exhaust or the process crashes, all progress is lost. No way to resume from where you left off.'
	},

	temporal: {
		title: 'Temporal Durable Execution',
		files: [
			{
				filename: 'Workflow.cs',
				language: 'csharp',
				code: `using Temporalio.Workflows;

[Workflow]
public class RocketMission
{
    [WorkflowRun]
    public async Task RunAsync(string missionId)
    {
        var opt = new ActivityOptions
        {
            StartToCloseTimeout =
                TimeSpan.FromSeconds(30),
            RetryPolicy = new()
            {
                InitialInterval =
                    TimeSpan.FromMilliseconds(150), // demo-tuned; real default is 1s
                BackoffCoefficient = 2,
                MaximumAttempts = 0,                // unlimited retries
                MaximumInterval =
                    TimeSpan.FromSeconds(5),        // demo-tuned; real default is 100s
            }
        };

        // Ignition
        var engine = await Workflow.ExecuteActivityAsync(
            (RocketActivities a) => a.StartEngineAsync(missionId), opt);
        await Workflow.ExecuteActivityAsync(
            (RocketActivities a) => a.PressurizeFuelAsync(engine.Id), opt);
        await Workflow.ExecuteActivityAsync(
            (RocketActivities a) => a.VerifyAllClearAsync(missionId), opt);

        // Launch
        await Workflow.ExecuteActivityAsync(
            (RocketActivities a) => a.AuthorizeLaunchAsync(missionId), opt);
        await Workflow.ExecuteActivityAsync(
            (RocketActivities a) => a.RetractArmAsync(missionId), opt);
        await Workflow.ExecuteActivityAsync(
            (RocketActivities a) => a.MainEngineStartAsync(missionId), opt);
        await Workflow.ExecuteActivityAsync(
            (RocketActivities a) => a.InitDownlinkAsync(missionId), opt);

        // Atmospheric Exit
        await Workflow.ExecuteActivityAsync(
            (RocketActivities a) => a.ActivateFCSAsync(missionId), opt);
        await Workflow.ExecuteActivityAsync(
            (RocketActivities a) => a.MonitorHeatShieldAsync(missionId), opt);
        await Workflow.ExecuteActivityAsync(
            (RocketActivities a) => a.ActivateSBandAsync(missionId), opt);

        // Deep Space Navigation
        await Workflow.ExecuteActivityAsync(
            (RocketActivities a) => a.CalculateBurnAsync(missionId), opt);
        await Workflow.ExecuteActivityAsync(
            (RocketActivities a) => a.ExecuteManeuverAsync(missionId), opt);

        // Orbital Insertion
        await Workflow.ExecuteActivityAsync(
            (RocketActivities a) => a.CalculateInsertionAsync(missionId), opt);
        await Workflow.ExecuteActivityAsync(
            (RocketActivities a) => a.EnableStationKeepingAsync(missionId), opt);

        // Docking
        await Workflow.ExecuteActivityAsync(
            (RocketActivities a) => a.ExtendMechanismAsync(missionId), opt);
        await Workflow.ExecuteActivityAsync(
            (RocketActivities a) => a.FinalApproachAsync(missionId), opt);
        await Workflow.ExecuteActivityAsync(
            (RocketActivities a) => a.ConfirmCaptureAsync(missionId), opt);
    }
}

// Each activity is one operation — the unit of retry.
// If MonitorHeatShield() fails, only that call retries.
// Retries, state, timeouts — handled by the platform.`
			},
			{
				filename: 'Activities.cs',
				language: 'csharp',
				code: `using Temporalio.Activities;

// Each activity wraps one operation for idempotency.

public class RocketActivities
{
    // Ignition
    [Activity]
    public Task<Engine> StartEngineAsync(string id) =>
        _engineService.Start(id);
    [Activity]
    public Task PressurizeFuelAsync(string engineId) =>
        _fuelSystem.Pressurize(engineId);
    [Activity]
    public Task VerifyAllClearAsync(string id) =>
        _safety.VerifyAllClear(id);

    // Launch
    [Activity]
    public Task AuthorizeLaunchAsync(string id) =>
        _launchControl.Authorize(id);
    [Activity]
    public Task RetractArmAsync(string id) =>
        _tower.RetractArm(id);
    [Activity]
    public Task MainEngineStartAsync(string id) =>
        _propulsion.MainEngineStart(id);
    [Activity]
    public Task InitDownlinkAsync(string id) =>
        _telemetry.InitDownlink(id);

    // Atmospheric Exit
    [Activity]
    public Task ActivateFCSAsync(string id) =>
        _guidance.ActivateFCS(id);
    [Activity]
    public Task MonitorHeatShieldAsync(string id) =>
        _aerodynamics.MonitorHeatShield(id);
    [Activity]
    public Task ActivateSBandAsync(string id) =>
        _comms.ActivateSBand(id);

    // Deep Space Navigation
    [Activity]
    public Task CalculateBurnAsync(string id) =>
        _navigation.CalculateBurn(id);
    [Activity]
    public Task ExecuteManeuverAsync(string id) =>
        _propulsion.ExecuteManeuver(id);

    // Orbital Insertion
    [Activity]
    public Task CalculateInsertionAsync(string id) =>
        _orbital.CalculateInsertion(id);
    [Activity]
    public Task EnableStationKeepingAsync(string id) =>
        _rcs.EnableStationKeeping(id);

    // Docking
    [Activity]
    public Task ExtendMechanismAsync(string id) =>
        _dockingPort.ExtendMechanism(id);
    [Activity]
    public Task FinalApproachAsync(string id) =>
        _rcs.FinalApproach(id);
    [Activity]
    public Task ConfirmCaptureAsync(string id) =>
        _dockingPort.ConfirmCapture(id);
}`
			},
			{
				filename: 'Worker.cs',
				language: 'csharp',
				code: `using Temporalio.Client;
using Temporalio.Worker;

var client = await TemporalClient.ConnectAsync(
    new("temporal:7233"));

using var worker = new TemporalWorker(
    client,
    new TemporalWorkerOptions("rocket-missions")
        .AddWorkflow<RocketMission>()
        .AddAllActivities(new RocketActivities()));

await worker.ExecuteAsync();`
			}
		],
		complexity: 'Medium',
		summary: 'The workflow reads like the no-retry version — but with full durability. Activities make the same service calls as EDA handlers, but without message routing or saga state. The orchestration stays in one file instead of being scattered across codebase in message handlers. The tradeoff: you need a Temporal cluster running or Temporal Cloud.'
	},

	eda: {
		title: 'Event-Driven Saga (NServiceBus)',
		files: [
			{
				filename: 'RocketJourneySaga.cs',
				language: 'csharp',
				code: `public class RocketJourneySaga :
    Saga<RocketJourneyData>,
    IAmStartedByMessages<StartMission>,
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

// NServiceBus 8 — transport configured directly
var transport = new RabbitMQTransport();
transport.ConnectionString("host=rabbitmq");
transport.UseConventionalRoutingTopology(QueueType.Quorum);

var routing = endpointConfig.UseTransport(transport);
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
        TimeSpan.FromSeconds(10)); // demo-tuned: 0.8s/1.2s/1.6s
});

// After 8 total retries:
// Message moves to the error queue.
// Requires manual review and retry
// via error management tooling.`
			}
		],
		complexity: 'High',
		summary: 'The handlers make the same service calls as Temporal activities — but each one must also know what message to publish next. The orchestration that Temporal keeps in a single workflow file is scattered across the saga, handlers, message contracts, and routing config. To trace the mission flow, you hop between files following messages. Both approaches give you durability — but EDA pays for it with distributed complexity.'
	}
};
