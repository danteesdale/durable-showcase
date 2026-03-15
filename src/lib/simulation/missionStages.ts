import type { MissionDefinition, MissionStage, ServiceGroup } from './types';

function group(name: string, calls: [string, string][]): ServiceGroup {
	return {
		name,
		calls: calls.map(([service, method]) => ({
			id: `${service}.${method}`,
			service,
			method
		}))
	};
}

// ============================================================
// Stage 1: Ignition (~15 calls, 3 groups)
// ============================================================
const ignition: MissionStage = {
	name: 'Ignition',
	baseDurationMs: 3000,
	groups: [
		group('Engine Systems', [
			['Engine', 'start'],
			['Engine', 'selfTest'],
			['Engine', 'setThrust'],
			['Engine', 'confirmIgnition'],
			['Engine', 'stabilize']
		]),
		group('Fuel Systems', [
			['FuelSystem', 'pressurize'],
			['FuelSystem', 'openValves'],
			['FuelSystem', 'verifyFlow'],
			['FuelSystem', 'setMixRatio'],
			['FuelSystem', 'confirmPressure']
		]),
		group('Pre-flight Safety', [
			['Safety', 'verifyAllClear'],
			['Safety', 'armAbortSystem'],
			['Safety', 'lockGantry'],
			['Safety', 'clearPad'],
			['Safety', 'finalCheck']
		])
	]
};

// ============================================================
// Stage 2: Launch (~25 calls, 4 groups)
// ============================================================
const launch: MissionStage = {
	name: 'Launch',
	baseDurationMs: 5000,
	groups: [
		group('Launch Control', [
			['LaunchControl', 'authorize'],
			['LaunchControl', 'startSequence'],
			['LaunchControl', 'verifyCountdown'],
			['LaunchControl', 'releaseLocks'],
			['LaunchControl', 'armSRBs'],
			['LaunchControl', 'confirmGo'],
			['LaunchControl', 'commitToLaunch']
		]),
		group('Tower Systems', [
			['Tower', 'retractArm'],
			['Tower', 'disconnectUmbilical'],
			['Tower', 'clearSwingArm'],
			['Tower', 'activateDeluge'],
			['Tower', 'confirmSeparation'],
			['Tower', 'reportClear']
		]),
		group('Propulsion', [
			['Propulsion', 'mainEngineStart'],
			['Propulsion', 'confirmThrust'],
			['Propulsion', 'throttleUp'],
			['Propulsion', 'monitorVibration'],
			['Propulsion', 'adjustGimbal'],
			['Propulsion', 'confirmNominal'],
			['Propulsion', 'reportPerformance']
		]),
		group('Telemetry Uplink', [
			['Telemetry', 'initDownlink'],
			['Telemetry', 'syncClocks'],
			['Telemetry', 'reportLaunchParams'],
			['Telemetry', 'verifySignal'],
			['Telemetry', 'confirmTracking']
		])
	]
};

// ============================================================
// Stage 3: Atmospheric Exit (~35 calls, 4 groups)
// ============================================================
const atmosphericExit: MissionStage = {
	name: 'Atmospheric Exit',
	baseDurationMs: 6000,
	groups: [
		group('Navigation', [
			['Navigation', 'calculateTrajectory'],
			['Navigation', 'getGPSFix'],
			['Navigation', 'computeAzimuth'],
			['Navigation', 'verifyInclination'],
			['Navigation', 'updateFlightPath'],
			['Navigation', 'checkExclusion'],
			['Navigation', 'reportDeviation'],
			['Navigation', 'correctCourse'],
			['Navigation', 'verifyAltitude'],
			['Navigation', 'confirmTrajectory']
		]),
		group('Atmospheric Monitoring', [
			['Weather', 'getAtmosphericData'],
			['Weather', 'getWindShear'],
			['Weather', 'getJetStream'],
			['Weather', 'getDensityProfile'],
			['Weather', 'getThermalGradient'],
			['Weather', 'checkLightning'],
			['Weather', 'reportConditions'],
			['Weather', 'confirmSafe']
		]),
		group('Thrust Vector Control', [
			['Thrust', 'adjustVector'],
			['Thrust', 'compensateWind'],
			['Thrust', 'maintainAttitude'],
			['Thrust', 'monitorAcceleration'],
			['Thrust', 'throttleProfile'],
			['Thrust', 'stagePrep'],
			['Thrust', 'confirmMaxQ'],
			['Thrust', 'throttleDown'],
			['Thrust', 'throttleUp'],
			['Thrust', 'reportPerformance']
		]),
		group('Structural Monitoring', [
			['Structure', 'monitorStress'],
			['Structure', 'checkVibration'],
			['Structure', 'verifyFairing'],
			['Structure', 'tempCheck'],
			['Structure', 'pressureDiff'],
			['Structure', 'confirmIntegrity'],
			['Structure', 'reportStatus']
		])
	]
};

// ============================================================
// Stage 4: Deep Space Navigation (~55 calls, 5 groups)
// ============================================================
const deepSpaceNav: MissionStage = {
	name: 'Deep Space Navigation',
	baseDurationMs: 8000,
	groups: [
		group('Star Tracking & Positioning', [
			['StarTracker', 'getCelestialFix'],
			['StarTracker', 'identifyStars'],
			['StarTracker', 'computeAttitude'],
			['StarTracker', 'crossReference'],
			['StarTracker', 'verifyAlignment'],
			['StarTracker', 'calibrateSensors'],
			['StarTracker', 'updateCatalog'],
			['StarTracker', 'reportAccuracy'],
			['StarTracker', 'compensateDrift'],
			['StarTracker', 'lockTarget'],
			['StarTracker', 'confirmFix'],
			['StarTracker', 'logPosition']
		]),
		group('Course Computation', [
			['Navigation', 'plotCourse'],
			['Navigation', 'computeTransfer'],
			['Navigation', 'optimizeDeltaV'],
			['Navigation', 'checkHazards'],
			['Navigation', 'modelGravityAssist'],
			['Navigation', 'verifyEphemeris'],
			['Navigation', 'computeCorrection'],
			['Navigation', 'simulateTrajectory'],
			['Navigation', 'validateManeuver'],
			['Navigation', 'scheduleCorrection'],
			['Navigation', 'executeCorrection'],
			['Navigation', 'confirmCourse']
		]),
		group('Communications Relay', [
			['Communication', 'relayStatus'],
			['Communication', 'encryptUplink'],
			['Communication', 'syncWithDSN'],
			['Communication', 'sendTelemetry'],
			['Communication', 'receiveCommands'],
			['Communication', 'confirmReceipt'],
			['Communication', 'switchAntenna'],
			['Communication', 'adjustGain'],
			['Communication', 'reportSignal'],
			['Communication', 'logTransmission']
		]),
		group('Power Management', [
			['Power', 'monitorSolar'],
			['Power', 'adjustPanels'],
			['Power', 'checkBattery'],
			['Power', 'balanceLoad'],
			['Power', 'reportConsumption'],
			['Power', 'optimizeUsage'],
			['Power', 'thermalRegulation'],
			['Power', 'checkDegradation'],
			['Power', 'switchBus'],
			['Power', 'verifyRedundancy'],
			['Power', 'confirmNominal']
		]),
		group('Ground Control Sync', [
			['GroundControl', 'getWaypoints'],
			['GroundControl', 'uploadNavData'],
			['GroundControl', 'confirmTrajectory'],
			['GroundControl', 'syncMissionClock'],
			['GroundControl', 'reviewTelemetry'],
			['GroundControl', 'approveManeuver'],
			['GroundControl', 'checkAnomalies'],
			['GroundControl', 'updateMissionPlan'],
			['GroundControl', 'logDecision'],
			['GroundControl', 'reportStatus']
		])
	]
};

// ============================================================
// Stage 5: Orbital Insertion (~65 calls, 5 groups)
// ============================================================
const orbitalInsertion: MissionStage = {
	name: 'Orbital Insertion',
	baseDurationMs: 9000,
	groups: [
		group('Orbital Mechanics', [
			['OrbitalMechanics', 'calculateBurn'],
			['OrbitalMechanics', 'verifyWindow'],
			['OrbitalMechanics', 'computeInsertion'],
			['OrbitalMechanics', 'modelPerturbations'],
			['OrbitalMechanics', 'optimizeFuel'],
			['OrbitalMechanics', 'checkDecay'],
			['OrbitalMechanics', 'simulateOrbit'],
			['OrbitalMechanics', 'validateParams'],
			['OrbitalMechanics', 'computeApsides'],
			['OrbitalMechanics', 'verifyInclination'],
			['OrbitalMechanics', 'checkResonance'],
			['OrbitalMechanics', 'planCircularization'],
			['OrbitalMechanics', 'confirmBurnParams'],
			['OrbitalMechanics', 'armBurnSequence'],
			['OrbitalMechanics', 'executeBurn']
		]),
		group('Attitude Control', [
			['Attitude', 'getCurrentOrientation'],
			['Attitude', 'computeManeuver'],
			['Attitude', 'fireRCS'],
			['Attitude', 'verifyPointing'],
			['Attitude', 'dampOscillation'],
			['Attitude', 'lockOrientation'],
			['Attitude', 'calibrateGyros'],
			['Attitude', 'monitorDrift'],
			['Attitude', 'correctPrecession'],
			['Attitude', 'confirmStability'],
			['Attitude', 'reportAttitude'],
			['Attitude', 'prepForBurn'],
			['Attitude', 'holdDuringBurn']
		]),
		group('Propulsion Management', [
			['Propulsion', 'getAvailableDeltaV'],
			['Propulsion', 'checkFuelReserves'],
			['Propulsion', 'primeEngine'],
			['Propulsion', 'testIgniter'],
			['Propulsion', 'setThrottleProfile'],
			['Propulsion', 'openFuelValves'],
			['Propulsion', 'monitorChamberPressure'],
			['Propulsion', 'confirmIgnition'],
			['Propulsion', 'maintainThrust'],
			['Propulsion', 'monitorPerformance'],
			['Propulsion', 'adjustMixture'],
			['Propulsion', 'cutoffSequence'],
			['Propulsion', 'confirmShutdown']
		]),
		group('Navigation Verification', [
			['Navigation', 'confirmApproach'],
			['Navigation', 'trackOrbitParams'],
			['Navigation', 'measureVelocity'],
			['Navigation', 'computeResidual'],
			['Navigation', 'planCorrection'],
			['Navigation', 'executeAdjustment'],
			['Navigation', 'verifyOrbit'],
			['Navigation', 'checkStationkeeping'],
			['Navigation', 'reportOrbitalElements'],
			['Navigation', 'confirmCircular'],
			['Navigation', 'updateEphemeris'],
			['Navigation', 'lockOrbit'],
			['Navigation', 'verifyStability'],
			['Navigation', 'confirmInsertion']
		]),
		group('Telemetry & Reporting', [
			['Telemetry', 'reportOrbitalParams'],
			['Telemetry', 'sendFullState'],
			['Telemetry', 'logBurnPerformance'],
			['Telemetry', 'reportFuelRemaining'],
			['Telemetry', 'sendPositionFix'],
			['Telemetry', 'reportSubsystems'],
			['Telemetry', 'confirmDataIntegrity'],
			['Telemetry', 'archiveFlightData'],
			['Telemetry', 'relayToGroundControl'],
			['Telemetry', 'confirmReceipt']
		])
	]
};

// ============================================================
// Stage 6: Docking (~55 calls, 5 groups)
// ============================================================
const docking: MissionStage = {
	name: 'Docking',
	baseDurationMs: 8000,
	groups: [
		group('Approach & Rendezvous', [
			['Docking', 'requestApproach'],
			['Docking', 'getApproachVector'],
			['Docking', 'computeIntercept'],
			['Docking', 'phasingManeuver'],
			['Docking', 'matchOrbit'],
			['Docking', 'closeApproach'],
			['Docking', 'fineApproach'],
			['Docking', 'holdPosition'],
			['Docking', 'confirmRange'],
			['Docking', 'reportApproach'],
			['Docking', 'requestFinalApproach'],
			['Docking', 'confirmClearance']
		]),
		group('Station Systems', [
			['Station', 'getPortStatus'],
			['Station', 'reservePort'],
			['Station', 'alignDockingRing'],
			['Station', 'extendCapture'],
			['Station', 'activateGuidance'],
			['Station', 'reportReady'],
			['Station', 'monitorApproach'],
			['Station', 'confirmAlignment'],
			['Station', 'armCapture'],
			['Station', 'reportStatus'],
			['Station', 'clearZone']
		]),
		group('Proximity & Safety', [
			['Proximity', 'scanClearance'],
			['Proximity', 'lidarScan'],
			['Proximity', 'radarCheck'],
			['Proximity', 'thermalScan'],
			['Proximity', 'checkDebrisField'],
			['Proximity', 'monitorClosure'],
			['Proximity', 'computeCollisionProb'],
			['Proximity', 'verifyApproachCone'],
			['Proximity', 'checkRotationRate'],
			['Proximity', 'confirmSafe'],
			['Proximity', 'finalCheck'],
			['Proximity', 'reportAllClear']
		]),
		group('Docking Mechanism', [
			['Docking', 'extendProbe'],
			['Docking', 'alignMechanism'],
			['Docking', 'softCapture'],
			['Docking', 'confirmContact'],
			['Docking', 'retractProbe'],
			['Docking', 'hardCapture'],
			['Docking', 'sealRing'],
			['Docking', 'pressureCheck'],
			['Docking', 'verifySeals'],
			['Docking', 'confirmHardDock'],
			['Docking', 'connectUmbilicals'],
			['Docking', 'openHatches']
		]),
		group('Post-Docking Verification', [
			['PostDock', 'verifyAtmosphere'],
			['PostDock', 'checkPressure'],
			['PostDock', 'confirmPower'],
			['PostDock', 'testComms'],
			['PostDock', 'reportSuccess'],
			['PostDock', 'syncSystems'],
			['PostDock', 'logCompletion'],
			['PostDock', 'missionComplete']
		])
	]
};

// ============================================================
// Complete Mission Definition
// ============================================================

const stages: MissionStage[] = [
	ignition,
	launch,
	atmosphericExit,
	deepSpaceNav,
	orbitalInsertion,
	docking
];

const totalCalls = stages.reduce(
	(sum, stage) => sum + stage.groups.reduce(
		(gSum, g) => gSum + g.calls.length, 0
	), 0
);

const totalGroups = stages.reduce(
	(sum, stage) => sum + stage.groups.length, 0
);

export const MISSION: MissionDefinition = {
	stages,
	totalCalls,
	totalGroups
};

/** Get the number of calls in a specific stage */
export function getStageCallCount(stageIndex: number): number {
	return MISSION.stages[stageIndex].groups.reduce(
		(sum, g) => sum + g.calls.length, 0
	);
}

/** Calculate mission success probability given per-call reliability */
export function missionSuccessProbability(perCallReliability: number): number {
	return Math.pow(perCallReliability / 100, totalCalls) * 100;
}
