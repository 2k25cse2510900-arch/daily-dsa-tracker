import React, { useRef, useEffect, useImperativeHandle, forwardRef } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import {
  getRacerForwardDistance,
  getProceduralRacerPosition,
  getProceduralRacerHeading,
} from '../simulation/RaceMovementController';

/**
 * JourneyCamera
 * 
 * Game camera designed for continuous forward travel through procedural world.
 * - Follow Racer mode (default): close-up journey action following racers along highway.
 * - Scenic Vista mode: elevated panoramic view of the road winding through mountains.
 * - Free Orbit mode: unconstrained 360° pan, tilt, zoom.
 * 
 * USER CONTROL GUARANTEE:
 * - When the user manually rotates or zooms the camera, the view angle and distance
 *   are PRESERVED as the racer travels forward.
 * - Never snaps back automatically on a timer.
 * - Reset Camera explicitly resets to default framing.
 */
const JourneyCamera = forwardRef(function JourneyCamera(
  { cameraMode = 'leader', racers = [], focusedMemberId = null },
  ref
) {
  const { camera } = useThree();
  const controlsRef = useRef();
  const manualOffsetRef = useRef(null);

  const leaderTarget = racers?.find((r) => r.rank === 1) || racers?.[0];
  const targetMember = focusedMemberId
    ? racers?.find((r) => r.id === focusedMemberId || r.memberId === focusedMemberId) || leaderTarget
    : leaderTarget;

  // Initialize camera position on mount or camera mode change
  useEffect(() => {
    manualOffsetRef.current = null;
    if (!controlsRef.current || !targetMember) return;

    const s = getRacerForwardDistance(targetMember, 0, racers);
    const lane = typeof targetMember.laneIndex === 'number' ? targetMember.laneIndex : 0;
    const [tx, ty, tz] = getProceduralRacerPosition(s, lane);
    const heading = getProceduralRacerHeading(s);
    const forwardX = Math.sin(heading);
    const forwardZ = Math.cos(heading);

    if (cameraMode === 'broadcast') {
      // Scenic Vista: elevated cinematic highway shot
      camera.position.set(tx - forwardX * 36.0 + 16.0, ty + 24.0, tz - forwardZ * 36.0);
      controlsRef.current.target.set(tx + forwardX * 12.0, ty + 2.0, tz + forwardZ * 12.0);
      controlsRef.current.update();
    } else if (cameraMode === 'leader') {
      // Journey Follow: third-person action camera looking ahead
      camera.position.set(tx - forwardX * 13.0, ty + 4.8, tz - forwardZ * 13.0);
      controlsRef.current.target.set(tx + forwardX * 2.5, ty + 1.35, tz + forwardZ * 2.5);
      controlsRef.current.update();
    } else if (cameraMode === 'orbit') {
      // Free View
      camera.position.set(tx - 20.0, ty + 15.0, tz - 20.0);
      controlsRef.current.target.set(tx, ty + 1.2, tz);
      controlsRef.current.update();
    }
  }, [cameraMode, focusedMemberId, targetMember, camera]);

  useImperativeHandle(ref, () => ({
    zoomIn: () => {
      if (controlsRef.current) {
        controlsRef.current.dollyIn(1.25);
        controlsRef.current.update();
      }
    },
    zoomOut: () => {
      if (controlsRef.current) {
        controlsRef.current.dollyOut(1.25);
        controlsRef.current.update();
      }
    },
    resetView: () => {
      manualOffsetRef.current = null;
      if (controlsRef.current && targetMember) {
        const t = 0;
        const s = getRacerForwardDistance(targetMember, t, racers);
        const lane = typeof targetMember.laneIndex === 'number' ? targetMember.laneIndex : 0;
        const [tx, ty, tz] = getProceduralRacerPosition(s, lane);
        const heading = getProceduralRacerHeading(s);
        const forwardX = Math.sin(heading);
        const forwardZ = Math.cos(heading);

        if (cameraMode === 'broadcast') {
          camera.position.set(tx - forwardX * 36.0 + 16.0, ty + 24.0, tz - forwardZ * 36.0);
          controlsRef.current.target.set(tx + forwardX * 12.0, ty + 2.0, tz + forwardZ * 12.0);
        } else {
          camera.position.set(tx - forwardX * 13.0, ty + 4.8, tz - forwardZ * 13.0);
          controlsRef.current.target.set(tx + forwardX * 2.5, ty + 1.35, tz + forwardZ * 2.5);
        }
        controlsRef.current.update();
      }
    },
    focusMember: (memberId) => {
      manualOffsetRef.current = null;
      const m = racers?.find((r) => r.id === memberId || r.memberId === memberId);
      if (m && controlsRef.current) {
        const s = getRacerForwardDistance(m, 0, racers);
        const lane = typeof m.laneIndex === 'number' ? m.laneIndex : 0;
        const [tx, ty, tz] = getProceduralRacerPosition(s, lane);
        const heading = getProceduralRacerHeading(s);
        const forwardX = Math.sin(heading);
        const forwardZ = Math.cos(heading);
        controlsRef.current.target.set(tx + forwardX * 2.5, ty + 1.35, tz + forwardZ * 2.5);
        camera.position.set(tx - forwardX * 13.0, ty + 4.8, tz - forwardZ * 13.0);
        controlsRef.current.update();
      }
    },
  }));

  useFrame((state, delta) => {
    if (!controlsRef.current || !targetMember) return;

    const t = state.clock.getElapsedTime();
    const s = getRacerForwardDistance(targetMember, t, racers);
    const lane = typeof targetMember.laneIndex === 'number' ? targetMember.laneIndex : 0;
    const [tx, ty, tz] = getProceduralRacerPosition(s, lane);
    const heading = getProceduralRacerHeading(s);
    const forwardX = Math.sin(heading);
    const forwardZ = Math.cos(heading);

    if (cameraMode === 'leader') {
      const defaultTargetX = tx + forwardX * 2.5;
      const defaultTargetY = ty + 1.35;
      const defaultTargetZ = tz + forwardZ * 2.5;

      // If user has manually moved the camera, preserve their custom relative offset
      if (manualOffsetRef.current) {
        const { dx, dy, dz } = manualOffsetRef.current;
        const newTarget = new THREE.Vector3(defaultTargetX, defaultTargetY, defaultTargetZ);
        controlsRef.current.target.copy(newTarget);
        camera.position.set(defaultTargetX + dx, defaultTargetY + dy, defaultTargetZ + dz);
        controlsRef.current.update();
      } else {
        const camX = tx - forwardX * 13.0;
        const camY = ty + 4.8;
        const camZ = tz - forwardZ * 13.0;

        const followFactor = Math.min(1.0, delta * 8.0);
        camera.position.x = THREE.MathUtils.lerp(camera.position.x, camX, followFactor);
        camera.position.y = THREE.MathUtils.lerp(camera.position.y, camY, followFactor);
        camera.position.z = THREE.MathUtils.lerp(camera.position.z, camZ, followFactor);

        controlsRef.current.target.x = THREE.MathUtils.lerp(controlsRef.current.target.x, defaultTargetX, followFactor);
        controlsRef.current.target.y = THREE.MathUtils.lerp(controlsRef.current.target.y, defaultTargetY, followFactor);
        controlsRef.current.target.z = THREE.MathUtils.lerp(controlsRef.current.target.z, defaultTargetZ, followFactor);
        controlsRef.current.update();
      }
    } else if (cameraMode === 'broadcast') {
      const defaultTargetX = tx + forwardX * 12.0;
      const defaultTargetY = ty + 2.0;
      const defaultTargetZ = tz + forwardZ * 12.0;

      if (manualOffsetRef.current) {
        const { dx, dy, dz } = manualOffsetRef.current;
        controlsRef.current.target.set(defaultTargetX, defaultTargetY, defaultTargetZ);
        camera.position.set(defaultTargetX + dx, defaultTargetY + dy, defaultTargetZ + dz);
        controlsRef.current.update();
      } else {
        const camX = tx - forwardX * 36.0 + 16.0;
        const camY = ty + 24.0;
        const camZ = tz - forwardZ * 36.0;

        const followFactor = Math.min(1.0, delta * 6.0);
        camera.position.x = THREE.MathUtils.lerp(camera.position.x, camX, followFactor);
        camera.position.y = THREE.MathUtils.lerp(camera.position.y, camY, followFactor);
        camera.position.z = THREE.MathUtils.lerp(camera.position.z, camZ, followFactor);

        controlsRef.current.target.x = THREE.MathUtils.lerp(controlsRef.current.target.x, defaultTargetX, followFactor);
        controlsRef.current.target.y = THREE.MathUtils.lerp(controlsRef.current.target.y, defaultTargetY, followFactor);
        controlsRef.current.target.z = THREE.MathUtils.lerp(controlsRef.current.target.z, defaultTargetZ, followFactor);
        controlsRef.current.update();
      }
    }
  });

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enableDamping={true}
      dampingFactor={0.08}
      minDistance={4}
      maxDistance={350}
      minPolarAngle={Math.PI / 16}
      maxPolarAngle={Math.PI / 2 - 0.02}
      screenSpacePanning={true}
      mouseButtons={{
        LEFT: THREE.MOUSE.ROTATE,
        MIDDLE: THREE.MOUSE.DOLLY,
        RIGHT: THREE.MOUSE.PAN,
      }}
      touches={{
        ONE: THREE.TOUCH.ROTATE,
        TWO: THREE.TOUCH.DOLLY_PAN,
      }}
      onStart={() => {
        // User started interacting: preserve manual camera offset relative to target
        if (controlsRef.current) {
          const target = controlsRef.current.target;
          manualOffsetRef.current = {
            dx: camera.position.x - target.x,
            dy: camera.position.y - target.y,
            dz: camera.position.z - target.z,
          };
        }
      }}
      onChange={() => {
        // Continuous updates while dragging: update preserved manual offset
        if (controlsRef.current) {
          const target = controlsRef.current.target;
          manualOffsetRef.current = {
            dx: camera.position.x - target.x,
            dy: camera.position.y - target.y,
            dz: camera.position.z - target.z,
          };
        }
      }}
    />
  );
});

export default JourneyCamera;
