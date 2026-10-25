import React, { Suspense, useRef, useEffect, useState, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { GLBCharacter } from './CharacterViewer';
import { CHARACTERS } from '../../data/characters';
import { getCatalogItemById } from '../../data/wardrobe';

class CanvasErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error) {
    this.props.onError?.(error);
  }
  render() {
    if (this.state.hasError) return null;
    return this.props.children;
  }
}

/**
 * Resolves a full characterData object from the authenticated member appearance profile.
 */
export function resolveCharacterDataFromAppearance(appearance) {
  const charId = appearance?.equippedCharacterId || appearance?.selectedCharacterId || 'buster-blitz';
  const base = CHARACTERS.find((c) => c.id === charId) || CHARACTERS[0];
  const charColors = appearance?.customColors?.[charId] || {};
  const equippedSlots = appearance?.equippedCosmetics?.[charId] || {};
  const outfitId = appearance?.equippedOutfits?.[charId] || 'outfit-default';

  const headItem = equippedSlots.head ? getCatalogItemById(equippedSlots.head) : null;
  const faceItem = equippedSlots.face ? getCatalogItemById(equippedSlots.face) : null;
  const upperItem = equippedSlots.upperBody ? getCatalogItemById(equippedSlots.upperBody) : null;
  const lowerItem = equippedSlots.lowerBody ? getCatalogItemById(equippedSlots.lowerBody) : null;
  const footwearItem = equippedSlots.footwear ? getCatalogItemById(equippedSlots.footwear) : null;
  const backItem = equippedSlots.backAccessory ? getCatalogItemById(equippedSlots.backAccessory) : null;
  const effectItem = equippedSlots.effect ? getCatalogItemById(equippedSlots.effect) : null;

  // Outfit defaults if slot is not explicitly set
  let headAccessory = headItem ? headItem.attachmentType : 'none';
  let upperBodyAccessory = upperItem ? upperItem.attachmentType : 'none';
  let backAccessory = backItem ? backItem.attachmentType : 'none';

  if (!headItem) {
    if (outfitId === 'outfit-royal') headAccessory = 'crown';
    else if (base.defaultEquipment?.head) {
      headAccessory = getCatalogItemById(base.defaultEquipment.head)?.attachmentType || 'none';
    }
  }
  if (!upperItem) {
    if (outfitId === 'outfit-warrior') upperBodyAccessory = 'armorPlate';
  }
  if (!backItem) {
    if (outfitId === 'outfit-royal') backAccessory = 'cape';
  }

  return {
    ...base,
    colors: {
      ...base.colors,
      baseColor: charColors.baseColor || base.colors.baseColor,
      accentColor: charColors.accentColor || base.colors.accentColor,
      secondaryColor: charColors.secondaryColor || base.colors.secondaryColor,
      podiumGlow: charColors.glowColor || base.colors.podiumGlow,
      visorColor: faceItem?.glowColor || charColors.glowColor || base.colors.visorColor,
    },
    accessories: {
      headAccessory,
      faceAccessory: faceItem ? faceItem.attachmentType : 'none',
      upperBodyAccessory,
      lowerBodyAccessory: lowerItem ? lowerItem.attachmentType : 'none',
      footwearAccessory: footwearItem ? footwearItem.attachmentType : 'none',
      backAccessory,
      effectType: effectItem ? effectItem.attachmentType : 'none',
    },
    vehicle: null,
    vehicleUpgrade: null,
    isDrivingMode: false,
  };
}

/**
 * AvatarScene for the compact sidebar/card preview (default mode).
 * Camera looks at the upper torso; autoRotate is opt-in.
 */
function AvatarScene({ characterData, onReady, isHovered, autoRotate = false }) {
  const modelRef = useRef();
  const { camera } = useThree();

  useEffect(() => {
    camera.lookAt(0, 0.42, 0);
  }, [camera]);

  useFrame((_, delta) => {
    // Dashboard profile preview stands still; only rotate if autoRotate is explicitly enabled
    if (autoRotate && modelRef.current) {
      const speed = isHovered ? 1.6 : 0.65;
      modelRef.current.rotation.y += delta * speed;
    }
  });

  return (
    <>
      <ambientLight intensity={1.15} color="#ffffff" />
      <directionalLight position={[2.5, 4.0, 3.5]} intensity={1.5} color="#ffffff" />
      <directionalLight position={[-2.5, 2.5, -2.5]} intensity={0.65} color="#cbd5e1" />
      <directionalLight position={[0, -2.0, 2.0]} intensity={0.4} color="#94a3b8" />
      <pointLight position={[0, 1.2, 1.8]} intensity={0.45} color="#a855f7" distance={4} />

      <group ref={modelRef} position={[0, 0, 0]}>
        <GLBCharacter characterData={characterData} onReady={onReady} />
      </group>
    </>
  );
}

/**
 * AvatarSceneFullBody for the profile-page preview.
 * Camera is pulled back to show the full character from head to feet.
 * No rotation, no orbit controls — purely a static front-facing showcase.
 */
function AvatarSceneFullBody({ characterData, onReady }) {
  const { camera } = useThree();

  useEffect(() => {
    // Position camera so entire ~1.8 unit tall character fits in view
    // fov=32 + distance=3.6 → full body visible without cropping feet or crown
    camera.position.set(0, 0.72, 3.6);
    camera.lookAt(0, 0.72, 0);
    camera.updateProjectionMatrix();
  }, [camera]);

  return (
    <>
      <ambientLight intensity={1.2} color="#ffffff" />
      <directionalLight position={[2.5, 5.0, 3.5]} intensity={1.6} color="#ffffff" />
      <directionalLight position={[-2.5, 3.0, -2.5]} intensity={0.7} color="#e2d9f3" />
      <directionalLight position={[0, -1.5, 2.5]} intensity={0.35} color="#c4b5fd" />
      <pointLight position={[0, 1.6, 2.0]} intensity={0.5} color="#a855f7" distance={5} />

      <group position={[0, 0, 0]}>
        <GLBCharacter characterData={characterData} onReady={onReady} />
      </group>
    </>
  );
}

export default function CharacterAvatar({
  appearance = null,
  autoRotate = false,
  profilePreview = false,
  onReady = null,
  onError = null,
}) {
  const [characterData, setCharacterData] = useState(() => resolveCharacterDataFromAppearance(appearance));
  const [hasError, setHasError] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    if (appearance) {
      setCharacterData(resolveCharacterDataFromAppearance(appearance));
      return;
    }

    let active = true;
    fetch('/api/characterverse/me', { credentials: 'same-origin' })
      .then((res) => {
        if (!res.ok) throw new Error('Could not load character appearance.');
        return res.json();
      })
      .then((profile) => {
        if (active && profile?.appearance) {
          setCharacterData(resolveCharacterDataFromAppearance(profile.appearance));
        }
      })
      .catch(() => {
        // Fall back gracefully to starter Buster Blitz if endpoint cannot be reached
        if (active) {
          setCharacterData(resolveCharacterDataFromAppearance(null));
        }
      });

    return () => {
      active = false;
    };
  }, [appearance]);

  if (hasError || !characterData) {
    return null;
  }

  // ── Profile-preview mode: full body, transparent, no controls, no pointer events ──
  if (profilePreview) {
    return (
      <div
        className="character-avatar-3d-root relative w-full h-full select-none"
        style={{ pointerEvents: 'none', userSelect: 'none' }}
        aria-hidden="true"
      >
        <CanvasErrorBoundary onError={onError}>
          <Suspense fallback={null}>
            <Canvas
              camera={{ position: [0, 0.72, 3.6], fov: 32 }}
              gl={{
                antialias: true,
                alpha: true,
                powerPreference: 'high-performance',
              }}
              style={{ width: '100%', height: '100%', background: 'transparent' }}
              onCreated={({ gl }) => {
                gl.setClearColor(0x000000, 0);
              }}
            >
              <AvatarSceneFullBody characterData={characterData} onReady={onReady} />
            </Canvas>
          </Suspense>
        </CanvasErrorBoundary>
      </div>
    );
  }

  // ── Standard compact-avatar mode (sidebar / card) ──
  return (
    <div
      className="character-avatar-3d-root relative w-full h-full cursor-pointer select-none"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      title="Equipped 3D Character"
    >
      <CanvasErrorBoundary onError={onError}>
        <Suspense fallback={null}>
          <Canvas
            camera={{ position: [0, 0.45, 2.05], fov: 36 }}
            gl={{
              antialias: true,
              alpha: true,
              powerPreference: 'high-performance',
            }}
            style={{ width: '100%', height: '100%', background: 'transparent' }}
            onCreated={({ gl }) => {
              gl.setClearColor(0x000000, 0);
            }}
          >
            <AvatarScene
              characterData={characterData}
              onReady={onReady}
              isHovered={isHovered}
              autoRotate={autoRotate}
            />
          </Canvas>
        </Suspense>
      </CanvasErrorBoundary>
    </div>
  );
}
