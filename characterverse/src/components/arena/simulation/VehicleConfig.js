import { VEHICLES } from '../../../data/vehicles.js';

/**
 * Centralized Vehicle Configuration System (Phase 2)
 *
 * Defines performance parameters, kinematic properties, suspension/flight dynamics,
 * wheel properties, and visual presentation for all CharacterVerse vehicles.
 *
 * Vehicle categories:
 * - Foot (None / Athlete Locomotion): Natural human athletic stride
 * - Common: Ninja Superbike (high-speed maneuverability, lean banking, wheel rotation)
 * - Rare/Epic: Apex Supercar (twin-turbo aerodynamics, 4-wheel rotation, low-slung chassis)
 * - Legendary: Cosmic Titan Rocket (sub-orbital hovering propulsion, flight clearance, plasma trail)
 */

export const VEHICLE_CONFIGS = {
  none: {
    id: 'none',
    name: 'Athletic Foot Locomotion',
    modelType: 'foot',
    rarity: 'COMMON',
    tagline: 'Standard Athlete Sprint',
    baseSpeed: 13.5, // m/s (~48.6 km/h)
    speedRating: 70,
    acceleration: 8.0, // m/s²
    handling: 1.0,
    elevation: 0.06,
    flightElevation: 0,
    isFlying: false,
    suspensionBob: 0.08,
    strideFrequency: 12.0,
    wheelRotation: false,
    wheelRadius: 0,
    bankFactor: 0.0,
    pitchFactor: 0.0,
    defaultTrail: null,
    upgradeTrail: null,
    badgeColor: '#94a3b8',
    hudRarity: 'ATHLETE',
    hudLabel: 'On Foot',
  },
  'vehicle-bike': {
    id: 'vehicle-bike',
    name: 'Ninja Superbike',
    modelType: 'bike',
    rarity: 'COMMON',
    tagline: 'High-Performance Street Racer',
    baseSpeed: 15.5, // m/s (~55.8 km/h)
    speedRating: 82,
    acceleration: 12.0, // m/s²
    handling: 1.25,
    elevation: 0.02,
    flightElevation: 0,
    isFlying: false,
    suspensionBob: 0.02,
    strideFrequency: 0, // mounted riders do not run
    wheelRotation: true,
    wheelRadius: 0.32, // meters (32cm front / 34cm rear)
    bankFactor: 0.14, // natural motorcycle lean into turns
    pitchFactor: 0.025, // subtle front fork compression/extension
    defaultTrail: 'dust',
    upgradeTrail: 'bike-sparks',
    badgeColor: '#10b981',
    hudRarity: 'COMMON',
    hudLabel: 'Ninja Superbike',
  },
  'vehicle-car': {
    id: 'vehicle-car',
    name: 'Apex Supercar',
    modelType: 'car',
    rarity: 'EPIC',
    tagline: 'Futuristic High-Performance Speeder',
    baseSpeed: 17.8, // m/s (~64.1 km/h)
    speedRating: 95,
    acceleration: 15.0, // m/s²
    handling: 1.15,
    elevation: 0.02,
    flightElevation: 0,
    isFlying: false,
    suspensionBob: 0.012,
    strideFrequency: 0,
    wheelRotation: true,
    wheelRadius: 0.30, // meters (20-inch sport wheels)
    bankFactor: 0.04, // subtle centrifugal chassis roll
    pitchFactor: 0.02, // squat on acceleration, dive on braking
    defaultTrail: 'tireSmoke',
    upgradeTrail: 'car-coins',
    badgeColor: '#a855f7',
    hudRarity: 'RARE',
    hudLabel: 'Apex Supercar',
  },
  'vehicle-rocket': {
    id: 'vehicle-rocket',
    name: 'Cosmic Titan Rocket',
    modelType: 'rocket',
    rarity: 'LEGENDARY',
    tagline: 'Sub-Orbital Jet Pod',
    baseSpeed: 20.5, // m/s (~73.8 km/h)
    speedRating: 100,
    acceleration: 18.0, // m/s²
    handling: 0.95,
    elevation: 1.35, // controlled flight elevation above roadbed
    flightElevation: 1.35,
    isFlying: true,
    suspensionBob: 0.09, // smooth hovering aerodynamic altitude wave
    strideFrequency: 0,
    wheelRotation: false,
    wheelRadius: 0,
    bankFactor: 0.16, // aerodynamic bank on curve entry
    pitchFactor: -0.05, // nose pitched slightly upwards during thrust
    defaultTrail: 'flames',
    upgradeTrail: 'rocket-warp',
    badgeColor: '#f59e0b',
    hudRarity: 'LEGENDARY',
    hudLabel: 'Cosmic Titan Rocket',
  },
};

/**
 * Resolves centralized vehicle configuration by ID or vehicle object.
 * Always falls back safely to 'none' (athlete locomotion) if invalid or unowned.
 */
export function getVehicleConfig(vehicleOrId) {
  if (!vehicleOrId) return VEHICLE_CONFIGS.none;

  const vehicleId = typeof vehicleOrId === 'string'
    ? vehicleOrId
    : (vehicleOrId.id || null);

  if (vehicleId && VEHICLE_CONFIGS[vehicleId]) {
    return VEHICLE_CONFIGS[vehicleId];
  }

  // Check if it matches modelType
  if (typeof vehicleOrId === 'object' && vehicleOrId.modelType) {
    const matched = Object.values(VEHICLE_CONFIGS).find(
      (cfg) => cfg.modelType === vehicleOrId.modelType
    );
    if (matched) return matched;
  }

  return VEHICLE_CONFIGS.none;
}

/**
 * Returns telemetry data for live HUD display (speed km/h, metric, labels).
 * Frame-rate independent calculation using delta time or elapsed time.
 */
export function calculateVehicleTelemetry(vehicleConfig, isSuperman = false, elapsedTime = 0) {
  const config = vehicleConfig || VEHICLE_CONFIGS.none;
  const t = typeof elapsedTime === 'number' && !isNaN(elapsedTime) ? elapsedTime : 0;

  // Compute live speed in km/h with subtle organic throttle micro-fluctuations
  const baseSpeedMs = isSuperman && config.id === 'none' ? 19.5 : config.baseSpeed;
  const microThrottle = Math.sin(t * 3.5) * 0.4 + Math.cos(t * 1.8) * 0.2;
  const currentSpeedMs = Math.max(5.0, baseSpeedMs + microThrottle);
  const currentSpeedKmh = Math.round(currentSpeedMs * 3.6);

  return {
    vehicleId: config.id,
    name: isSuperman && config.id === 'none' ? 'Superman Flight (Aero Cape)' : config.name,
    rarity: isSuperman && config.id === 'none' ? 'LEGENDARY' : config.hudRarity,
    speedKmh: currentSpeedKmh,
    speedMs: Number(currentSpeedMs.toFixed(1)),
    speedRating: config.speedRating,
    handlingRating: Math.round(config.handling * 80),
    isFlying: config.isFlying || isSuperman,
    elevation: isSuperman && config.id === 'none' ? 1.25 : config.elevation,
    badgeColor: isSuperman && config.id === 'none' ? '#ef4444' : config.badgeColor,
    hudLabel: isSuperman && config.id === 'none' ? 'Superman' : config.hudLabel,
  };
}
