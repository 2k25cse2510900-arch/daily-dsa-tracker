import React, { useMemo } from 'react';
import {
  CHUNK_LENGTH,
  ACTIVE_CHUNKS_BEHIND,
  ACTIVE_CHUNKS_AHEAD,
} from './WorldConfig';
import RoadChunk from './RoadChunk';
import TerrainChunk from './TerrainChunk';
import NatureProps from './NatureProps';

/**
 * ProceduralWorld (Chunk Streaming Manager)
 * 
 * Streams procedural road, sculpted terrain, and environmental props
 * ahead of the racing pack while recycling chunks left behind.
 * Guaranteed continuous C^1 road connection across chunk boundaries.
 */
export default function ProceduralWorld({ leadDistance = 0 }) {
  const activeChunkIndices = useMemo(() => {
    const currentK = Math.floor(leadDistance / CHUNK_LENGTH);
    const indices = [];
    for (
      let k = currentK - ACTIVE_CHUNKS_BEHIND;
      k <= currentK + ACTIVE_CHUNKS_AHEAD;
      k++
    ) {
      indices.push(k);
    }
    return indices;
  }, [leadDistance]);

  return (
    <group>
      {activeChunkIndices.map((chunkIndex) => (
        <group key={`chunk-${chunkIndex}`}>
          <RoadChunk chunkIndex={chunkIndex} />
          <TerrainChunk chunkIndex={chunkIndex} />
          <NatureProps chunkIndex={chunkIndex} />
        </group>
      ))}
    </group>
  );
}
