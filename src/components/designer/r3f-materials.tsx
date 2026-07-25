import { useEffect, useMemo } from 'react';
import {
  DataTexture,
  LinearFilter,
  NoColorSpace,
  RGBAFormat,
  RepeatWrapping,
  UnsignedByteType,
} from 'three';

/**
 * Procedural wood: solid §3.2 hex on `color`, grayscale grain on `roughnessMap`.
 *
 * Root cause of the solid-black board (Sprint 52 attempt 1): a colour DataTexture used
 * three-channel format + sRGB color space. Three.js then fails the upload ("sRGB encoded
 * textures have to use RGBAFormat and UnsignedByteType") and the map samples as black,
 * multiplying the base colour to zero. Grain stays grayscale + NoColorSpace so it never
 * owns the hue.
 */
export function ProceduralWoodMaterial({ colorHex }: { colorHex: string }) {
  const roughnessMap = useMemo(() => createGrainRoughnessMap(), []);

  useEffect(() => () => roughnessMap.dispose(), [roughnessMap]);

  return (
    <meshStandardMaterial
      color={colorHex}
      roughnessMap={roughnessMap}
      roughness={0.82}
      metalness={0}
    />
  );
}

/** Exported for Node tests — format/type/colorSpace wiring that kept the board black. */
export function createGrainRoughnessMap(): DataTexture {
  const size = 64;
  const data = new Uint8Array(size * size * 4);
  let offset = 0;

  for (let y = 0; y < size; y++) {
    const wave = Math.sin(y * 0.42) * 0.04;
    for (let x = 0; x < size; x++) {
      const noise = seededNoise(x, y) * 0.05;
      // Mid-grey band — modulates roughness, not albedo.
      const shade = clampByte((0.55 + wave + noise) * 255);
      data[offset++] = shade;
      data[offset++] = shade;
      data[offset++] = shade;
      data[offset++] = 255;
    }
  }

  const map = new DataTexture(data, size, size, RGBAFormat, UnsignedByteType);
  map.wrapS = RepeatWrapping;
  map.wrapT = RepeatWrapping;
  map.repeat.set(2, 6);
  map.magFilter = LinearFilter;
  map.minFilter = LinearFilter;
  map.colorSpace = NoColorSpace;
  map.needsUpdate = true;
  return map;
}

/** Species hex → linear RGB 0–1 for histogram / colour-fidelity tests (no WebGL). */
export function speciesColorLinear(colorHex: string): {
  r: number;
  g: number;
  b: number;
} {
  const hex = colorHex.replace('#', '');
  if (hex.length !== 6) {
    return { r: 0, g: 0, b: 0 };
  }
  return {
    r: parseInt(hex.slice(0, 2), 16) / 255,
    g: parseInt(hex.slice(2, 4), 16) / 255,
    b: parseInt(hex.slice(4, 6), 16) / 255,
  };
}

function seededNoise(x: number, y: number): number {
  const raw = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
  return raw - Math.floor(raw);
}

function clampByte(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value)));
}
