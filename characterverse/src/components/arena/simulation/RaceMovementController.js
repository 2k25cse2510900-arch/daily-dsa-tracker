import {
  getRacerWorldCoords,
  getRoadHeading,
  getRoadX,
  getRoadY,
  getRoadNormalXZ,
} from '../world/WorldConfig.js';
import { getVehicleConfig, calculateVehicleTelemetry } from './VehicleConfig.js';

/**
 * Continuous Physical Forward Traversal & Vehicle Kinematics Controller (Phase 2)
 *
 * Computes live physical forward distance along the procedural world highway
 * for each racer at simulation time t.
 *
 * Strictly separates visual travel & vehicle performance from verified LeetCode data:
 * - Solved counts, academic ranking, and milestones remain strictly authoritative.
 * - Visual simulation translates characters continuously forward along the road.
 * - Vehicle category (Bike, Car, Rocket, Foot) determines kinematics, suspension,
 *   banking, wheel spin, and HUD telemetry.
 */

export const BASE_RUNNING_SPEED = 14.0; // World units per second (~31 mph)

/**
 * Resolves the active vehicle config for a given racer
 */
export function getRacerVehicleConfig(racer) {
  const appearance = racer?.character || {};
  const raceMode = appearance.raceMode || (appearance.equippedVehicleId ? 'vehicle' : 'character');
  if (raceMode === 'character') {
    return getVehicleConfig(null);
  }
  const vehicleId = appearance.equippedVehicleId || appearance.vehicle?.id || null;
  return getVehicleConfig(vehicleId);
}

/**
 * Returns forward travel distance along the road for a specific racer at time t.
 * Delta-time and frame-rate independent calculation.
 */
export function getRacerForwardDistance(racer, elapsedTime = 0, racers = []) {
  const t = typeof elapsedTime === 'number' && !isNaN(elapsedTime) ? elapsedTime : 0;
  const leadDistance = t * BASE_RUNNING_SPEED;

  // Find leader from authoritative data
  const leader = (racers && racers.length > 0)
    ? (racers.find((r) => r.rank === 1) || racers[0])
    : racer;

  const leaderAuthoritative = typeof leader?.progress === 'number' ? leader.progress : 1.0;
  const racerAuthoritative = typeof racer?.progress === 'number' ? racer.progress : 0.0;

  // Authoritative gap between leader and this racer
  const rawGap = Math.max(0, leaderAuthoritative - racerAuthoritative);

  // Stagger runners visually along the highway according to authoritative gap + rank
  const rankOffset = Math.max(0, ((racer?.rank || 1) - 1)) * 8.5; // ~8.5m per rank
  const visualGap = Math.min(260.0, rawGap * 180.0 + rankOffset);

  // Vehicle-specific micro-cadence
  const vehicleConfig = getRacerVehicleConfig(racer);
  const lane = typeof racer?.laneIndex === 'number' ? racer.laneIndex : 0;

  // High-performance vehicles (Bike, Car, Rocket) glide smoothly without human stride bob
  const isVehicle = vehicleConfig.id !== 'none';
  const microVariation = isVehicle
    ? Math.sin(t * 0.9 + lane) * 0.4
    : Math.sin(t * 1.8 + lane * 1.25) * 1.2;

  return Math.max(0, leadDistance - visualGap + microVariation);
}

/**
 * Returns exact 3D coordinates [X, Y, Z] on the procedural road for a racer
 */
export function getProceduralRacerPosition(distance, laneIndex) {
  return getRacerWorldCoords(distance, laneIndex);
}

/**
 * Returns forward tangent heading angle (radians) for a racer
 */
export function getProceduralRacerHeading(distance) {
  return getRoadHeading(distance);
}

/**
 * Computes road curvature (dHeading/ds) to drive vehicle banking & chassis dynamics
 */
export function getProceduralRoadCurvature(distance) {
  const delta = 2.5;
  const hAhead = getRoadHeading(distance + delta);
  const hBehind = getRoadHeading(Math.max(0, distance - delta));
  let diff = hAhead - hBehind;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return diff / (delta * 2);
}

/**
 * Returns complete vehicle kinematics & orientation for a racer:
 * - verticalElevation (suspension, hover height, or foot stride bob)
 * - pitchAngle (throttle squat, climb angle)
 * - bankAngle (motorcycle lean, car roll, rocket banking)
 * - forwardHeading (tangent to road curve)
 */
export function getRacerKinematics(racer, characterData, distance, laneIndex, elapsedTime, reducedMotion = false) {
  const t = typeof elapsedTime === 'number' && !isNaN(elapsedTime) ? elapsedTime : 0;
  const heading = getProceduralRacerHeading(distance);
  const curvature = getProceduralRoadCurvature(distance);

  const vehicleConfig = getRacerVehicleConfig(racer);
  const vehicleType = vehicleConfig.modelType;
  const isSuperman = characterData?.id === 'superman';

  let verticalElevation = 0.06;
  let bankAngle = 0;
  let pitchAngle = 0;
  let stridePhase = 0;

  if (vehicleType === 'bike') {
    // Bike: subtle suspension vibration, lean into turns
    const suspension = reducedMotion ? 0 : Math.sin(t * 18.0 + laneIndex) * 0.015;
    verticalElevation = vehicleConfig.elevation + suspension;
    // Motorbike leans sharply into curve
    const lean = curvature * 14.0 * vehicleConfig.bankFactor;
    bankAngle = lean + (reducedMotion ? 0 : Math.sin(t * 3.5 + laneIndex) * 0.015);
    pitchAngle = vehicleConfig.pitchFactor;
  } else if (vehicleType === 'car') {
    // Car: tight low sports suspension, subtle centrifugal chassis roll
    const suspension = reducedMotion ? 0 : Math.sin(t * 22.0 + laneIndex) * 0.006;
    verticalElevation = vehicleConfig.elevation + suspension;
    // Car centrifugal roll (body tilts slightly outward from curve center)
    const roll = -curvature * 5.0 * vehicleConfig.bankFactor;
    bankAngle = roll;
    pitchAngle = vehicleConfig.pitchFactor;
  } else if (vehicleType === 'rocket') {
    // Rocket: controlled flight elevation and aerodynamic hover
    const hoverWave = reducedMotion ? 0 : Math.sin(t * 2.2 + laneIndex) * vehicleConfig.suspensionBob;
    verticalElevation = vehicleConfig.flightElevation + hoverWave;
    // Aerodynamic bank into turns
    const flightBank = curvature * 18.0 * vehicleConfig.bankFactor;
    bankAngle = flightBank + (reducedMotion ? 0 : Math.sin(t * 2.6 + laneIndex) * 0.04);
    pitchAngle = vehicleConfig.pitchFactor + (reducedMotion ? 0 : Math.sin(t * 1.5 + laneIndex) * 0.015);
  } else if (isSuperman) {
    // Superman superhero flight: elevated 1.25m clearance (Preserved tested invariant)
    verticalElevation = 1.25 + (reducedMotion ? 0 : Math.sin(t * 3.2 + laneIndex) * 0.08);
    bankAngle = !reducedMotion ? Math.sin(t * 2.8 + laneIndex) * 0.08 : 0;
    pitchAngle = 0;
  } else {
    // Athletic Runner: natural foot stride bob & longitudinal phase displacement
    const strideFreq = vehicleConfig.strideFrequency || 12.0;
    const strideBob = reducedMotion ? 0 : Math.abs(Math.sin(t * strideFreq + laneIndex)) * 0.08;
    stridePhase = reducedMotion ? 0 : Math.sin(t * strideFreq + laneIndex) * 0.04;
    verticalElevation = vehicleConfig.elevation + strideBob;
    bankAngle = 0;
    pitchAngle = 0;
  }

  return {
    heading,
    bankAngle,
    pitchAngle,
    verticalElevation,
    stridePhase,
    isMounted: vehicleType === 'bike' || vehicleType === 'car' || vehicleType === 'rocket',
    vehicleConfig,
  };
}
