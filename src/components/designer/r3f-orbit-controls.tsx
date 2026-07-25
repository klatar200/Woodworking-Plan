'use client';

import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo } from 'react';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

/**
 * Orbit/dolly bound to the WebGL canvas (gl.domElement).
 *
 * drei's OrbitControls uses three-stdlib, which (a) prefers R3F's
 * `events.connected` wrapper over the canvas and (b) registers `wheel`
 * without `{ passive: false }`. That leaves the canvas at `touch-action:
 * auto` and lets the page scroll while the camera dollies. three's
 * OrbitControls stamps `touch-action: none` on the canvas and registers
 * a non-passive wheel listener that preventDefaults at the control layer.
 */
export function BoardOrbitControls({
  maxDim,
  thickness,
}: {
  maxDim: number;
  thickness: number;
}) {
  const camera = useThree((s) => s.camera);
  const gl = useThree((s) => s.gl);
  const invalidate = useThree((s) => s.invalidate);
  const set = useThree((s) => s.set);
  const get = useThree((s) => s.get);

  // Default framing distance ≈ |cameraFor() position| (see r3f-canvas).
  const defaultDistance = maxDim * 1.35;
  // Equal log-space travel either side of default; stay outside the stock
  // and keep the board on-screen at the far clamp.
  const minDistance = Math.max(defaultDistance / 2.1, thickness * 2.5);
  const maxDistance = defaultDistance * 2.1;

  const controls = useMemo(() => new OrbitControls(camera), [camera]);

  useEffect(() => {
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.enablePan = false;
    controls.enableZoom = true;
    controls.zoomSpeed = 0.9;
    // Default rotateSpeed is 1.0 — small wrist drags felt dead on a ~470px canvas.
    controls.rotateSpeed = 1.85;
    controls.minDistance = minDistance;
    controls.maxDistance = maxDistance;
    controls.maxPolarAngle = Math.PI * 0.48;
    controls.target.set(0, thickness * 0.18, 0);

    controls.connect(gl.domElement);

    const onChange = () => invalidate();
    controls.addEventListener('change', onChange);

    const previous = get().controls;
    set({ controls });

    return () => {
      controls.removeEventListener('change', onChange);
      controls.dispose();
      set({ controls: previous });
    };
  }, [
    controls,
    get,
    gl.domElement,
    invalidate,
    maxDistance,
    minDistance,
    set,
    thickness,
  ]);

  useFrame(() => {
    if (controls.enabled) controls.update();
  }, -1);

  return null;
}
