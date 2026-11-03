import * as THREE from 'three';

/**
 * World Configuration & Analytical Procedural Road Functions
 * 
 * Defines the deterministic road spine X(s), Y(s), tangent, normal,
 * and chunk dimensions for the endless procedural mountain world.
 */

export const CHUNK_LENGTH = 120.0;     // Forward length of each procedural chunk (world units)
export const ACTIVE_CHUNKS_BEHIND = 1;  // Chunks retained behind lead racer
export const ACTIVE_CHUNKS_AHEAD = 4;   // Chunks streamed ahead into distance (total span ~600 units)
export const ROAD_LANES = 8;
export const LANE_WIDTH = 2.0;
export const ROAD_SHOULDER = 2.0;
export const TOTAL_ROAD_WIDTH = ROAD_LANES * LANE_WIDTH + 2 * ROAD_SHOULDER; // 20.0 units

/**
 * Lane offset from road centerline:
 * Lane 0 = -7.0, Lane 1 = -5.0, ..., Lane 7 = +7.0
 */
export function getLaneOffset(laneIndex) {
  const lane = Math.max(0, Math.min(ROAD_LANES - 1, typeof laneIndex === 'number' ? laneIndex : 0));
  return -7.0 + lane * LANE_WIDTH;
}

/**
 * Analytical Road Centerline X coordinate at travel distance s
 * Continuous sum of gentle sines producing sweeping valley highway curves.
 */
export function getRoadX(s) {
  return (
    28.0 * Math.sin(0.0075 * s) +
    14.0 * Math.sin(0.018 * s + 1.2) +
    5.5 * Math.sin(0.042 * s + 2.4)
  );
}

/**
 * First derivative dX/ds for exact analytical tangent
 */
export function getRoadDX(s) {
  return (
    28.0 * 0.0075 * Math.cos(0.0075 * s) +
    14.0 * 0.018 * Math.cos(0.018 * s + 1.2) +
    5.5 * 0.042 * Math.cos(0.042 * s + 2.4)
  );
}

/**
 * Analytical Road Centerline Elevation Y coordinate at travel distance s
 * Gentle rolling highway elevation, bridge rises, and valley dips.
 */
export function getRoadY(s) {
  return (
    4.5 * Math.sin(0.006 * s + 0.5) +
    2.2 * Math.cos(0.014 * s) +
    1.0 * Math.sin(0.032 * s)
  );
}

/**
 * First derivative dY/ds for exact analytical tangent
 */
export function getRoadDY(s) {
  return (
    4.5 * 0.006 * Math.cos(0.006 * s + 0.5) -
    2.2 * 0.014 * Math.sin(0.014 * s) +
    1.0 * 0.032 * Math.cos(0.032 * s)
  );
}

/**
 * Returns exact 3D position [x, y, z] of road centerline at distance s
 */
export function getRoadPoint(s) {
  return new THREE.Vector3(getRoadX(s), getRoadY(s), s);
}

/**
 * Returns normalized 3D forward tangent vector at distance s
 */
export function getRoadTangent(s) {
  const dx = getRoadDX(s);
  const dy = getRoadDY(s);
  const dz = 1.0;
  const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
  return new THREE.Vector3(dx / len, dy / len, dz / len);
}

/**
 * Returns normalized horizontal 2D normal vector [nx, nz] in XZ plane
 * pointing perpendicular to the road tangent (to the right: -tz, tx).
 */
export function getRoadNormalXZ(s) {
  const dx = getRoadDX(s);
  const dz = 1.0;
  const len = Math.sqrt(dx * dx + dz * dz);
  // Tangent is (dx/len, 1/len). Normal perpendicular to right is (1/len, -dx/len)
  return { nx: 1.0 / len, nz: -dx / len };
}

/**
 * Returns forward heading angle (radians) along road tangent
 */
export function getRoadHeading(s) {
  const dx = getRoadDX(s);
  const dz = 1.0;
  return Math.atan2(dx, dz);
}

/**
 * Computes exact 3D coordinates [x, y, z] for a racer at distance s in laneIndex
 */
export function getRacerWorldCoords(s, laneIndex) {
  const cx = getRoadX(s);
  const cy = getRoadY(s);
  const cz = s;
  const offset = getLaneOffset(laneIndex);
  const { nx, nz } = getRoadNormalXZ(s);
  return [cx + nx * offset, cy + 0.05, cz + nz * offset];
}

/**
 * Procedural Natural Terrain Height function
 * Flattened along road corridor, undulating grassy hills, and massive distant mountain massifs.
 */
export function getProceduralTerrainHeight(x, z) {
  const roadX = getRoadX(z);
  const roadY = getRoadY(z);
  const distToRoad = Math.abs(x - roadX);

  // Generous flat roadbed corridor (road half-width = 10.0m + 5.0m safety shoulder = 15.0m)
  // Keeps terrain slightly beneath roadbed to eliminate z-fighting and clipping on curves.
  if (distToRoad <= 15.0) {
    return roadY - 0.15;
  }

  // Base natural ground height
  const baseNoise =
    Math.sin(x * 0.045) * 3.5 +
    Math.cos(z * 0.035) * 2.8 +
    Math.sin(x * 0.09 + z * 0.06) * 1.5;

  let mountainHeight = 0;
  const flankDist = Math.max(0, distToRoad - 28.0);
  if (flankDist > 0) {
    // Majestic alpine mountain massifs rising on east and west flanks
    const ridgeScale = Math.min(85.0, flankDist * 0.75);
    const crag = Math.sin(x * 0.03 + z * 0.015) * 18.0 + Math.cos(x * 0.06 - z * 0.025) * 9.0;
    mountainHeight = ridgeScale + crag;
  }

  const naturalHeight = roadY + baseNoise + mountainHeight;

  // Smooth quadratic blend from flat road verge into natural terrain (15.0 to 28.0)
  if (distToRoad < 28.0) {
    const t = (distToRoad - 15.0) / 13.0;
    return THREE.MathUtils.lerp(roadY - 0.15, naturalHeight, t * t);
  }

  return naturalHeight;
}
