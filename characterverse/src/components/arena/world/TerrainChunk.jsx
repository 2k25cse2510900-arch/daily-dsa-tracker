import React, { useMemo } from 'react';
import * as THREE from 'three';
import { CHUNK_LENGTH, getProceduralTerrainHeight } from './WorldConfig';

/**
 * Creates continuous sculpted mountain-valley terrain mesh for chunk index k.
 * Connecting seamlessly to chunks k-1 and k+1.
 */
function createTerrainGeometry(zStart, zEnd, xSegments = 48, zSegments = 24) {
  const geom = new THREE.BufferGeometry();
  const vertices = [];
  const colors = [];
  const indices = [];

  const xMin = -180.0;
  const xMax = 180.0;

  for (let j = 0; j <= zSegments; j++) {
    const z = zStart + (j / zSegments) * (zEnd - zStart);

    for (let i = 0; i <= xSegments; i++) {
      const x = xMin + (i / xSegments) * (xMax - xMin);
      const y = getProceduralTerrainHeight(x, z);

      vertices.push(x, y, z);

      // Biome-altitude vertex tinting
      const color = new THREE.Color();
      if (y < 4.0) {
        // Lush green alpine valley floor
        color.set('#22c55e');
      } else if (y < 16.0) {
        // Meadow foothills
        color.set('#15803d');
      } else if (y < 36.0) {
        // Rocky granite crag
        color.set('#475569');
      } else {
        // Glistening alpine snowcap
        color.set('#f8fafc');
      }

      colors.push(color.r, color.g, color.b);
    }
  }

  for (let j = 0; j < zSegments; j++) {
    for (let i = 0; i < xSegments; i++) {
      const row1 = j * (xSegments + 1);
      const row2 = (j + 1) * (xSegments + 1);

      const i0 = row1 + i;
      const i1 = row1 + i + 1;
      const i2 = row2 + i;
      const i3 = row2 + i + 1;

      indices.push(i0, i2, i1);
      indices.push(i1, i2, i3);
    }
  }

  geom.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geom.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geom.setIndex(indices);
  geom.computeVertexNormals();
  return geom;
}

export default function TerrainChunk({ chunkIndex }) {
  const zStart = chunkIndex * CHUNK_LENGTH;
  const zEnd = (chunkIndex + 1) * CHUNK_LENGTH;

  const terrainGeom = useMemo(
    () => createTerrainGeometry(zStart, zEnd),
    [zStart, zEnd]
  );

  return (
    <mesh geometry={terrainGeom} receiveShadow>
      <meshStandardMaterial
        vertexColors
        roughness={0.88}
        metalness={0.06}
        flatShading={false}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}
