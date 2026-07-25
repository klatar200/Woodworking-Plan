import { useEffect, useMemo } from 'react';
import {
  Color,
  DataTexture,
  RGBFormat,
  RepeatWrapping,
  SRGBColorSpace,
} from 'three';

export function ProceduralWoodMaterial({ colorHex }: { colorHex: string }) {
  const map = useMemo(() => createGrainMap(colorHex), [colorHex]);

  useEffect(() => () => map.dispose(), [map]);

  return (
    <meshStandardMaterial
      color={colorHex}
      map={map}
      roughness={0.78}
      metalness={0}
    />
  );
}

function createGrainMap(colorHex: string) {
  const size = 64;
  const color = new Color(colorHex);
  const data = new Uint8Array(size * size * 3);
  let offset = 0;

  for (let y = 0; y < size; y++) {
    const wave = Math.sin(y * 0.42) * 0.035;
    for (let x = 0; x < size; x++) {
      const noise = seededNoise(x, y) * 0.06;
      const shade = 0.92 + wave + noise;
      data[offset++] = clampByte(color.r * 255 * shade);
      data[offset++] = clampByte(color.g * 255 * shade);
      data[offset++] = clampByte(color.b * 255 * shade);
    }
  }

  const map = new DataTexture(data, size, size, RGBFormat);
  map.wrapS = RepeatWrapping;
  map.wrapT = RepeatWrapping;
  map.repeat.set(2, 6);
  map.colorSpace = SRGBColorSpace;
  map.needsUpdate = true;
  return map;
}

function seededNoise(x: number, y: number): number {
  const raw = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
  return raw - Math.floor(raw);
}

function clampByte(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value)));
}
