import { useLayoutEffect, useMemo, useRef } from 'react';
import { DynamicDrawUsage, InstancedMesh, Object3D } from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import type { Cell } from '@/lib/board-designer/layout';
import type { BoardMetrics } from '@/lib/board-designer/types';
import { groupCellsBySpecies } from './r3f-layout';
import { ProceduralWoodMaterial } from './r3f-materials';
import { BoardOrbitControls } from './r3f-orbit-controls';

export function BoardScene({
  cells,
  metrics,
  background,
  surface,
}: {
  cells: Cell[];
  metrics: BoardMetrics;
  background: string;
  surface: string;
}) {
  const groups = useMemo(() => groupCellsBySpecies(cells), [cells]);
  const length = positiveOrOne(metrics.finishedLengthIn);
  const width = positiveOrOne(metrics.finishedWidthIn);
  const thickness = positiveOrOne(metrics.finishedThicknessIn);
  const groundSize = Math.max(length, width, thickness) * 2.2;
  const maxDim = Math.max(length, width, thickness);

  return (
    <>
      <color attach="background" args={[background]} />
      <ambientLight intensity={0.55} />
      <directionalLight
        castShadow
        position={[maxDim * 0.35, maxDim * 1.25, maxDim * 0.6]}
        intensity={2.4}
      />
      <spotLight
        castShadow
        position={[-maxDim * 0.65, maxDim * 0.9, -maxDim * 0.55]}
        angle={0.45}
        penumbra={0.55}
        intensity={1.3}
      />
      {/* Soft rim so light maple silhouette doesn't dissolve into --bg. */}
      <directionalLight
        position={[-maxDim * 0.15, maxDim * 0.35, -maxDim * 1.05]}
        intensity={0.55}
      />
      {groups.map((group) => (
        <SpeciesInstances
          key={group.speciesId}
          cells={group.cells}
          colorHex={group.colorHex}
          length={length}
          width={width}
          thickness={thickness}
        />
      ))}
      <mesh
        receiveShadow
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.035, 0]}
      >
        <planeGeometry args={[groundSize, groundSize]} />
        <shadowMaterial transparent opacity={0.18} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.04, 0]}>
        <planeGeometry args={[groundSize, groundSize]} />
        <meshStandardMaterial color={surface} roughness={0.94} />
      </mesh>
      <BoardOrbitControls maxDim={maxDim} thickness={thickness} />
    </>
  );
}

function SpeciesInstances({
  cells,
  colorHex,
  length,
  width,
  thickness,
}: {
  cells: Cell[];
  colorHex: string;
  length: number;
  width: number;
  thickness: number;
}) {
  const meshRef = useRef<InstancedMesh>(null);
  const dummy = useMemo(() => new Object3D(), []);
  const geometry = useMemo(() => new RoundedBoxGeometry(1, 1, 1, 2, 0.025), []);

  useLayoutEffect(() => {
    return () => geometry.dispose();
  }, [geometry]);

  useLayoutEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;

    mesh.instanceMatrix.setUsage(DynamicDrawUsage);
    for (let i = 0; i < cells.length; i++) {
      const cell = cells[i]!;
      dummy.position.set(
        cell.xIn + cell.wIn / 2 - length / 2,
        thickness / 2,
        cell.yIn + cell.hIn / 2 - width / 2,
      );
      dummy.scale.set(
        Math.max(0.01, cell.wIn * 0.992),
        thickness,
        Math.max(0.01, cell.hIn * 0.992),
      );
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  }, [cells, dummy, length, thickness, width]);

  return (
    <instancedMesh ref={meshRef} args={[geometry, undefined, cells.length]} castShadow>
      <ProceduralWoodMaterial colorHex={colorHex} />
    </instancedMesh>
  );
}

function positiveOrOne(value: number): number {
  return Number.isFinite(value) && value > 0 ? value : 1;
}
