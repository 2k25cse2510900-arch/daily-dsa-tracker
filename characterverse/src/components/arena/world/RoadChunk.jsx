import React, { useMemo } from 'react';
import * as THREE from 'three';
import {
  CHUNK_LENGTH,
  ROAD_LANES,
  LANE_WIDTH,
  getRoadX,
  getRoadY,
  getRoadNormalXZ,
  getLaneOffset,
} from './WorldConfig';

/**
 * Creates continuous 3D road ribbon geometry for chunk k.
 * Connecting perfectly to neighboring chunks (z0 to z1).
 */
function createRoadGeometry(zStart, zEnd, samples = 36) {
  const geom = new THREE.BufferGeometry();
  const vertices = [];
  const uvs = [];
  const indices = [];

  const halfWidth = 10.0; // 8 lanes * 2m + 2x2m shoulders = 20m total width

  for (let i = 0; i <= samples; i++) {
    const s = zStart + (i / samples) * (zEnd - zStart);
    const cx = getRoadX(s);
    const cy = getRoadY(s);
    const { nx, nz } = getRoadNormalXZ(s);

    // Left vertex
    const lx = cx - nx * halfWidth;
    const ly = cy + 0.12;
    const lz = s - nz * halfWidth;

    // Right vertex
    const rx = cx + nx * halfWidth;
    const ry = cy + 0.12;
    const rz = s + nz * halfWidth;

    vertices.push(lx, ly, lz);
    vertices.push(rx, ry, rz);

    const vNorm = (s - zStart) / 10.0;
    uvs.push(0, vNorm);
    uvs.push(1, vNorm);
  }

  for (let i = 0; i < samples; i++) {
    const i0 = i * 2;
    const i1 = i * 2 + 1;
    const i2 = (i + 1) * 2;
    const i3 = (i + 1) * 2 + 1;

    indices.push(i0, i1, i2);
    indices.push(i1, i3, i2);
  }

  geom.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geom.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geom.setIndex(indices);
  geom.computeVertexNormals();
  return geom;
}

/**
 * Creates 9 continuous white dashed lane markings along chunk
 */
function createLaneDividersGeometry(zStart, zEnd, samples = 32) {
  const geom = new THREE.BufferGeometry();
  const vertices = [];
  const indices = [];

  const dividerOffsets = [-8.0, -6.0, -4.0, -2.0, 0.0, 2.0, 4.0, 6.0, 8.0];
  const halfStrip = 0.06;

  dividerOffsets.forEach((offset) => {
    const baseIdx = vertices.length / 3;
    for (let i = 0; i <= samples; i++) {
      const s = zStart + (i / samples) * (zEnd - zStart);
      const cx = getRoadX(s);
      const cy = getRoadY(s);
      const { nx, nz } = getRoadNormalXZ(s);

      const px = cx + nx * offset;
      const py = cy + 0.15; // slightly above road bed
      const pz = s + nz * offset;

      vertices.push(px - nx * halfStrip, py, pz - nz * halfStrip);
      vertices.push(px + nx * halfStrip, py, pz + nz * halfStrip);
    }

    for (let i = 0; i < samples; i++) {
      const i0 = baseIdx + i * 2;
      const i1 = baseIdx + i * 2 + 1;
      const i2 = baseIdx + (i + 1) * 2;
      const i3 = baseIdx + (i + 1) * 2 + 1;

      indices.push(i0, i1, i2);
      indices.push(i1, i3, i2);
    }
  });

  geom.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geom.setIndex(indices);
  geom.computeVertexNormals();
  return geom;
}

/**
 * Creates continuous alternating red/white kerbs along road verges
 */
function createKerbGeometry(zStart, zEnd, isOuter = false, samples = 32) {
  const geom = new THREE.BufferGeometry();
  const vertices = [];
  const colors = [];
  const indices = [];

  const offset = isOuter ? 9.85 : -9.85;
  const kerbWidth = 0.55;

  for (let i = 0; i <= samples; i++) {
    const s = zStart + (i / samples) * (zEnd - zStart);
    const cx = getRoadX(s);
    const cy = getRoadY(s);
    const { nx, nz } = getRoadNormalXZ(s);

    const px = cx + nx * offset;
    const py = cy + 0.16;
    const pz = s + nz * offset;

    const sign = isOuter ? 1 : -1;
    vertices.push(px, py, pz);
    vertices.push(px + nx * kerbWidth * sign, py + 0.05, pz + nz * kerbWidth * sign);

    // Alternating red/white stripes every 3 world meters
    const isRed = Math.floor(s / 3.0) % 2 === 0;
    const r = isRed ? 0.88 : 0.95;
    const g = isRed ? 0.12 : 0.95;
    const b = isRed ? 0.12 : 0.95;

    colors.push(r, g, b);
    colors.push(r, g, b);
  }

  for (let i = 0; i < samples; i++) {
    const i0 = i * 2;
    const i1 = i * 2 + 1;
    const i2 = (i + 1) * 2;
    const i3 = (i + 1) * 2 + 1;

    indices.push(i0, i1, i2);
    indices.push(i1, i3, i2);
  }

  geom.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geom.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geom.setIndex(indices);
  geom.computeVertexNormals();
  return geom;
}

/**
 * RoadChunk renders the 8-lane road ribbon, lane dividers, and kerbs for chunk index k.
 */
export default function RoadChunk({ chunkIndex }) {
  const zStart = chunkIndex * CHUNK_LENGTH;
  const zEnd = (chunkIndex + 1) * CHUNK_LENGTH;

  const roadGeom = useMemo(() => createRoadGeometry(zStart, zEnd), [zStart, zEnd]);
  const dividersGeom = useMemo(() => createLaneDividersGeometry(zStart, zEnd), [zStart, zEnd]);
  const leftKerbGeom = useMemo(() => createKerbGeometry(zStart, zEnd, false), [zStart, zEnd]);
  const rightKerbGeom = useMemo(() => createKerbGeometry(zStart, zEnd, true), [zStart, zEnd]);

  return (
    <group>
      {/* 8-Lane Dark Asphalt Highway Bed */}
      <mesh geometry={roadGeom} receiveShadow>
        <meshStandardMaterial
          color="#1e2430"
          roughness={0.78}
          metalness={0.12}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* 9 White Dashed Running Lane Dividers */}
      <mesh geometry={dividersGeom}>
        <meshStandardMaterial
          color="#f8fafc"
          roughness={0.4}
          metalness={0.2}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Left Verge Alternating Kerb */}
      <mesh geometry={leftKerbGeom}>
        <meshStandardMaterial vertexColors roughness={0.65} side={THREE.DoubleSide} />
      </mesh>

      {/* Right Verge Alternating Kerb */}
      <mesh geometry={rightKerbGeom}>
        <meshStandardMaterial vertexColors roughness={0.65} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}
