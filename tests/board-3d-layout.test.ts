import { describe, expect, test } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { layoutTopFace } from '@/lib/board-designer/layout';
import { calculateMetrics } from '@/lib/board-designer/metrics';
import { getTemplate } from '@/lib/board-designer/templates';
import { groupCellsBySpecies, shouldUseSvgFallback } from '@/components/designer/r3f-layout';
import {
  createGrainRoughnessMap,
  speciesColorLinear,
} from '@/components/designer/r3f-materials';
import { SPECIES } from '@/lib/board-designer/species';
import { RGBAFormat, UnsignedByteType, NoColorSpace, RGBFormat } from 'three';
import { makePanel, makeStrip, makeV2Config } from './fixtures/board-design';

describe('board 3D layout helpers', () => {
  test('groups checkerboard cells into one instanced mesh group per species', () => {
    const checkerboard = getTemplate('checkerboard')?.config;
    expect(checkerboard).toBeDefined();

    const config = checkerboard!;
    const metrics = calculateMetrics(config);
    const cells = layoutTopFace(config, metrics);
    const groups = groupCellsBySpecies(cells);

    expect(cells).toHaveLength(96);
    expect(groups.map((group) => group.speciesId).sort()).toEqual([
      'hard-maple',
      'walnut',
    ]);
    expect(groups.map((group) => group.cells.length).sort((a, b) => a - b)).toEqual([
      48,
      48,
    ]);
  });

  test('keeps worst-case layout complete while selecting the SVG fallback', () => {
    const strips = Array.from({ length: 60 }, (_, i) =>
      makeStrip(`worst-${i + 1}`, i % 2 === 0 ? 'hard-maple' : 'walnut', 1),
    );
    const config = makeV2Config({
      name: 'Worst case',
      grain: 'end',
      sourceLengthIn: 96,
      sliceThicknessIn: 0.25,
      kerfIn: 0,
      panels: [makePanel('panel-1', 'Panel 1', 0.25, strips)],
      rowPattern: [
        { panelId: 'panel-1', transform: 'none' },
        { panelId: 'panel-1', transform: 'rot180' },
      ],
      rowCount: 384,
    });

    const metrics = calculateMetrics(config);
    const cells = layoutTopFace(config, metrics);

    expect(metrics.sliceCount).toBe(384);
    expect(metrics.complete).toBe(true);
    expect(metrics.finishedLengthIn).toBe(60);
    expect(metrics.finishedWidthIn).toBe(96);
    expect(cells).toHaveLength(60 * 384);
    expect(shouldUseSvgFallback(cells.length)).toBe(true);
  });

  test('board preview dynamically imports the WebGL canvas and keeps the BoardDiagram fallback', () => {
    const source = readFileSync(
      join(process.cwd(), 'src/components/designer/board-preview.tsx'),
      'utf8',
    );

    expect(source).toContain('dynamic(');
    expect(source).toContain('ssr: false');
    expect(source).toContain('BoardDiagram');
    expect(source).toMatch(/too many pieces for 3D preview|WebGL/i);
  });

  test('r3f sources do not include texture URLs or hotlinks', () => {
    const dir = join(process.cwd(), 'src/components/designer');
    const r3fSources = readdirSync(dir)
      .filter((name) => /^r3f-.*\.(ts|tsx)$/.test(name))
      .map((name) => readFileSync(join(dir, name), 'utf8'));

    expect(r3fSources.join('\n')).not.toMatch(
      /https?:\/\/|\.hdr\b|\.exr\b|\.ktx2?\b|\.jpe?g\b|\.png\b|textureLoader|useTexture/i,
    );
  });

  test('grain roughness map uses RGBAFormat + UnsignedByteType (not RGBFormat + sRGB)', () => {
    // Regression for solid-black board: RGBFormat + SRGBColorSpace failed the WebGL
    // upload and multiplied albedo to zero.
    const map = createGrainRoughnessMap();
    expect(map.format).toBe(RGBAFormat);
    expect(map.format).not.toBe(RGBFormat);
    expect(map.type).toBe(UnsignedByteType);
    expect(map.colorSpace).toBe(NoColorSpace);
    map.dispose();
  });

  test('species material colour wiring keeps §3.2 hexes as non-black albedo inputs', () => {
    const materialsSource = readFileSync(
      join(process.cwd(), 'src/components/designer/r3f-materials.tsx'),
      'utf8',
    );
    expect(materialsSource).toContain('color={colorHex}');
    expect(materialsSource).toContain('roughnessMap');
    expect(materialsSource).toMatch(/RGBAFormat/);
    expect(materialsSource).not.toMatch(/\bRGBFormat\b/);

    for (const species of SPECIES) {
      const rgb = speciesColorLinear(species.colorHex);
      expect(rgb.r + rgb.g + rgb.b).toBeGreaterThan(0.2);
      // Purpleheart / padauk stay distinctly chromatic — not near-grey black.
      expect(Math.max(rgb.r, rgb.g, rgb.b)).toBeGreaterThan(0.25);
    }
  });

  test('orbit controls bind three.js OrbitControls to gl.domElement (not drei/stdlib)', () => {
    // Regression: drei→three-stdlib listened on events.connected without
    // {passive:false}, so wheel zoomed AND scrolled the page; canvas stayed
    // touch-action:auto.
    const orbitSource = readFileSync(
      join(process.cwd(), 'src/components/designer/r3f-orbit-controls.tsx'),
      'utf8',
    );
    const canvasSource = readFileSync(
      join(process.cwd(), 'src/components/designer/r3f-canvas.tsx'),
      'utf8',
    );
    const sceneSource = readFileSync(
      join(process.cwd(), 'src/components/designer/r3f-scene.tsx'),
      'utf8',
    );

    expect(orbitSource).toContain(
      "from 'three/examples/jsm/controls/OrbitControls.js'",
    );
    expect(orbitSource).toContain('controls.connect(gl.domElement)');
    expect(orbitSource).toMatch(/rotateSpeed\s*=\s*1\.85/);
    expect(orbitSource).toMatch(/defaultDistance\s*=\s*maxDim\s*\*\s*1\.35/);
    expect(orbitSource).not.toMatch(
      /from ['"]@react-three\/drei['"]|from ['"]three-stdlib/,
    );
    expect(sceneSource).toContain('BoardOrbitControls');
    expect(sceneSource).not.toMatch(/from ['"]@react-three\/drei['"]/);
    // Wake-only wheel listener (passive); scroll lock stays on OrbitControls.
    expect(canvasSource).toMatch(
      /addEventListener\(\s*['"]wheel['"],\s*onWheel,\s*\{\s*passive:\s*true\s*\}/,
    );
    expect(canvasSource).not.toMatch(
      /const onWheel = \([^)]*\) => \{[^}]*preventDefault/,
    );
  });
});
