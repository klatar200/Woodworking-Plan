import { Canvas, useThree } from '@react-three/fiber';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PCFShadowMap } from 'three';
import type { Cell } from '@/lib/board-designer/layout';
import type { BoardMetrics } from '@/lib/board-designer/types';
import { BoardScene } from './r3f-scene';

const IDLE_PAUSE_MS = 2_000;

export function BoardR3FCanvas({
  cells,
  metrics,
  onCanvasReady,
  onContextLost,
}: {
  cells: Cell[];
  metrics: BoardMetrics;
  onCanvasReady: (canvas: HTMLCanvasElement | null) => void;
  onContextLost: () => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isVisible, setIsVisible] = useState(() => !document.hidden);
  const [recentInput, setRecentInput] = useState(true);
  const idleTimer = useRef<number | null>(null);
  const colors = useCssSceneColors();
  const camera = useMemo(() => cameraFor(metrics), [metrics]);

  const markActive = useCallback(() => {
    if (document.hidden) return;
    setRecentInput(true);
    if (idleTimer.current !== null) {
      window.clearTimeout(idleTimer.current);
    }
    idleTimer.current = window.setTimeout(() => {
      setRecentInput(false);
    }, IDLE_PAUSE_MS);
  }, []);

  useEffect(() => {
    markActive();
  }, [cells, markActive, metrics]);

  useEffect(() => {
    const onVisibilityChange = () => {
      const nextVisible = !document.hidden;
      setIsVisible(nextVisible);
      if (nextVisible) {
        markActive();
      } else {
        setRecentInput(false);
      }
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      if (idleTimer.current !== null) {
        window.clearTimeout(idleTimer.current);
      }
    };
  }, [markActive]);

  // Wake the demand frameloop on wheel; scroll locking is OrbitControls' job
  // (bound to gl.domElement with a non-passive wheel listener — see r3f-orbit-controls).
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = () => {
      markActive();
    };
    el.addEventListener('wheel', onWheel, { passive: true });
    return () => el.removeEventListener('wheel', onWheel);
  }, [markActive]);

  return (
    <div
      ref={containerRef}
      className="h-[min(68vh,34rem)] min-h-[18rem] w-full overflow-hidden rounded-[0.75rem] border border-border bg-bg"
      onPointerDown={markActive}
      onPointerMove={markActive}
    >
      <Canvas
        // "percentage" → PCFShadowMap (avoids PCFSoftShadowMap deprecation spam)
        shadows="percentage"
        dpr={[1, 2]}
        frameloop={isVisible && recentInput ? 'always' : 'demand'}
        camera={camera}
        gl={{ antialias: true, alpha: false, preserveDrawingBuffer: true }}
        onCreated={({ gl }) => {
          gl.shadowMap.type = PCFShadowMap;
        }}
        style={{ width: '100%', height: '100%' }}
      >
        <CanvasLifecycle
          onCanvasReady={onCanvasReady}
          onContextLost={onContextLost}
        />
        <BoardScene
          cells={cells}
          metrics={metrics}
          background={colors.background}
          surface={colors.surface}
        />
      </Canvas>
    </div>
  );
}

function CanvasLifecycle({
  onCanvasReady,
  onContextLost,
}: {
  onCanvasReady: (canvas: HTMLCanvasElement | null) => void;
  onContextLost: () => void;
}) {
  const { gl } = useThree();

  useEffect(() => {
    const canvas = gl.domElement;
    const handleContextLost = (event: Event) => {
      event.preventDefault();
      onContextLost();
    };

    onCanvasReady(canvas);
    canvas.addEventListener('webglcontextlost', handleContextLost, false);
    return () => {
      canvas.removeEventListener('webglcontextlost', handleContextLost, false);
      onCanvasReady(null);
    };
  }, [gl, onCanvasReady, onContextLost]);

  return null;
}

function useCssSceneColors() {
  const [colors, setColors] = useState({
    background: 'white',
    surface: 'white',
  });

  useEffect(() => {
    const read = () => {
      setColors({
        background: resolveCssColor('--bg', 'white'),
        surface: resolveCssColor('--surface', 'white'),
      });
    };
    const observer = new MutationObserver(read);

    read();
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });
    return () => observer.disconnect();
  }, []);

  return colors;
}

function resolveCssColor(name: string, fallback: string): string {
  if (!document.body) return fallback;

  const probe = document.createElement('span');
  probe.style.color = `var(${name})`;
  probe.style.position = 'absolute';
  probe.style.pointerEvents = 'none';
  probe.style.opacity = '0';
  document.body.appendChild(probe);
  const resolved = getComputedStyle(probe).color;
  probe.remove();
  return resolved || fallback;
}

function cameraFor(metrics: BoardMetrics) {
  const length = positiveOrOne(metrics.finishedLengthIn);
  const width = positiveOrOne(metrics.finishedWidthIn);
  const thickness = positiveOrOne(metrics.finishedThicknessIn);
  const maxDim = Math.max(length, width, thickness);

  return {
    fov: 38,
    near: 0.1,
    far: maxDim * 8,
    position: [maxDim * 0.75, maxDim * 0.65, maxDim * 0.9] as [
      number,
      number,
      number,
    ],
  };
}

function positiveOrOne(value: number): number {
  return Number.isFinite(value) && value > 0 ? value : 1;
}
