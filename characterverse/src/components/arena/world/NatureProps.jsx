import React, { useMemo } from 'react';
import * as THREE from 'three';
import {
  CHUNK_LENGTH,
  getRoadX,
  getRoadY,
  getRoadNormalXZ,
  getProceduralTerrainHeight,
} from './WorldConfig';

function pseudoRandom(seed) {
  const x = Math.sin(seed * 997.13 + 13.37) * 43758.5453;
  return x - Math.floor(x);
}

/**
 * NatureProps generates deterministic environmental props for chunkIndex:
 * - Alpine pines and deciduous trees
 * - Natural granite boulders
 * - River stream and stone bridge
 * - Rustic roadside timber guard posts
 */
export default function NatureProps({ chunkIndex }) {
  const zStart = chunkIndex * CHUNK_LENGTH;
  const zEnd = (chunkIndex + 1) * CHUNK_LENGTH;

  const propsData = useMemo(() => {
    const trees = [];
    const rocks = [];
    const fencePosts = [];

    // 1. Roadside timber fence posts along left and right shoulders
    const postStep = 10.0;
    for (let s = zStart; s < zEnd; s += postStep) {
      const rx = getRoadX(s);
      const ry = getRoadY(s);
      const { nx, nz } = getRoadNormalXZ(s);

      // Left post (offset -10.4)
      fencePosts.push({
        pos: [rx - nx * 10.4, ry + 0.5, s - nz * 10.4],
      });
      // Right post (offset +10.4)
      fencePosts.push({
        pos: [rx + nx * 10.4, ry + 0.5, s + nz * 10.4],
      });
    }

    // 2. Deterministic alpine trees and birch trees
    const treeCount = 28;
    for (let i = 0; i < treeCount; i++) {
      const sVal = zStart + pseudoRandom(chunkIndex * 71 + i * 13) * CHUNK_LENGTH;
      const rx = getRoadX(sVal);
      const side = pseudoRandom(chunkIndex * 37 + i * 29) > 0.5 ? 1 : -1;
      const distFromRoad = 14.0 + pseudoRandom(chunkIndex * 19 + i * 31) * 65.0;

      const px = rx + side * distFromRoad;
      const pz = sVal;
      const py = getProceduralTerrainHeight(px, pz);

      const scale = 0.85 + pseudoRandom(chunkIndex * 43 + i * 17) * 0.7;
      const isBirch = pseudoRandom(chunkIndex * 23 + i * 5) > 0.65;

      trees.push({
        pos: [px, py, pz],
        scale,
        isBirch,
      });
    }

    // 3. Granite boulders along verges and foothills
    const rockCount = 10;
    for (let i = 0; i < rockCount; i++) {
      const sVal = zStart + pseudoRandom(chunkIndex * 53 + i * 41) * CHUNK_LENGTH;
      const rx = getRoadX(sVal);
      const side = pseudoRandom(chunkIndex * 11 + i * 19) > 0.5 ? 1 : -1;
      const distFromRoad = 12.5 + pseudoRandom(chunkIndex * 17 + i * 7) * 32.0;

      const px = rx + side * distFromRoad;
      const pz = sVal;
      const py = getProceduralTerrainHeight(px, pz);
      const rockRadius = 1.0 + pseudoRandom(chunkIndex * 31 + i * 23) * 1.8;

      rocks.push({
        pos: [px, py + rockRadius * 0.45, pz],
        radius: rockRadius,
      });
    }

    // 4. Distant monumental mountain peaks along flanks
    const peaks = [
      {
        pos: [-140 + pseudoRandom(chunkIndex * 3) * 20, 32, zStart + 35],
        height: 65,
        radius: 42,
      },
      {
        pos: [140 - pseudoRandom(chunkIndex * 7) * 20, 36, zStart + 85],
        height: 72,
        radius: 46,
      },
    ];

    // 5. Alpine River & Stone Bridge (present on periodic chunks)
    const hasBridge = chunkIndex % 3 === 1;
    let bridgeInfo = null;
    if (hasBridge) {
      const bridgeZ = zStart + CHUNK_LENGTH * 0.5;
      const bx = getRoadX(bridgeZ);
      const by = getRoadY(bridgeZ);
      bridgeInfo = {
        pos: [bx, by - 1.2, bridgeZ],
        waterPos: [bx, -0.6, bridgeZ],
      };
    }

    return { trees, rocks, fencePosts, peaks, bridgeInfo };
  }, [chunkIndex, zStart, zEnd]);

  return (
    <group>
      {/* ── Roadside Timber Fence Posts ── */}
      {propsData.fencePosts.map((fp, i) => (
        <mesh key={`fp-${i}`} position={fp.pos} castShadow>
          <cylinderGeometry args={[0.09, 0.11, 1.1, 6]} />
          <meshStandardMaterial color="#78350f" roughness={0.9} />
        </mesh>
      ))}

      {/* ── Alpine Trees ── */}
      {propsData.trees.map((t, i) => (
        <group key={`tr-${i}`} position={t.pos} scale={[t.scale, t.scale, t.scale]}>
          {/* Trunk */}
          <mesh position={[0, 1.5, 0]} castShadow>
            <cylinderGeometry args={[0.2, 0.35, 3.0, 6]} />
            <meshStandardMaterial color="#451a03" roughness={0.9} />
          </mesh>
          {/* Foliage */}
          {t.isBirch ? (
            <mesh position={[0, 4.2, 0]} castShadow>
              <dodecahedronGeometry args={[2.2, 1]} />
              <meshStandardMaterial color="#22c55e" roughness={0.7} flatShading />
            </mesh>
          ) : (
            <>
              <mesh position={[0, 3.5, 0]} castShadow>
                <coneGeometry args={[2.0, 3.4, 7]} />
                <meshStandardMaterial color="#166534" roughness={0.8} flatShading />
              </mesh>
              <mesh position={[0, 5.2, 0]} castShadow>
                <coneGeometry args={[1.5, 2.8, 7]} />
                <meshStandardMaterial color="#15803d" roughness={0.8} flatShading />
              </mesh>
            </>
          )}
        </group>
      ))}

      {/* ── Natural Granite Boulders ── */}
      {propsData.rocks.map((r, i) => (
        <mesh key={`rk-${i}`} position={r.pos} castShadow receiveShadow>
          <dodecahedronGeometry args={[r.radius, 1]} />
          <meshStandardMaterial color="#475569" roughness={0.85} flatShading />
        </mesh>
      ))}

      {/* ── Distant Alpine Mountain Massifs ── */}
      {propsData.peaks.map((p, i) => (
        <group key={`pk-${i}`} position={p.pos}>
          <mesh castShadow receiveShadow>
            <coneGeometry args={[p.radius, p.height, 7]} />
            <meshStandardMaterial color="#334155" roughness={0.88} flatShading />
          </mesh>
          {/* Snowcap */}
          <mesh position={[0, p.height * 0.32, 0]}>
            <coneGeometry args={[p.radius * 0.45, p.height * 0.38, 7]} />
            <meshStandardMaterial color="#f8fafc" roughness={0.35} flatShading />
          </mesh>
        </group>
      ))}

      {/* ── River & Stone Bridge ── */}
      {propsData.bridgeInfo && (
        <group>
          {/* Flowing Alpine River running through the gorge */}
          <mesh
            position={propsData.bridgeInfo.waterPos}
            rotation={[-Math.PI / 2, 0, 0]}
            receiveShadow
          >
            <planeGeometry args={[180, 28]} />
            <meshStandardMaterial
              color="#0284c7"
              roughness={0.15}
              metalness={0.35}
              transparent
              opacity={0.88}
              side={THREE.DoubleSide}
            />
          </mesh>
          {/* Stone Bridge Pillars and Arches supporting the road */}
          <mesh position={propsData.bridgeInfo.pos} castShadow receiveShadow>
            <boxGeometry args={[22.0, 3.8, 16.0]} />
            <meshStandardMaterial color="#64748b" roughness={0.85} flatShading />
          </mesh>
        </group>
      )}
    </group>
  );
}
