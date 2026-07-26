import { Canvas, useThree } from '@react-three/fiber';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PCFShadowMap } from 'three';
import type { Cell } from '@/lib/board-designer/layout';
import type { BoardMetrics } from '@/lib/board-designer/types';
// The gate constant lives in `@/lib/board-designer/viewport` — NOT here. This
// module pulls in three.js, so anything that imports from it drags the 3D stack
// into the importer's bundle. See that file's note.
import { DESIGNER_WIDE_MQ } from '@/lib/board-designer/viewport';
import { BoardScene } from './r3f-scene';

const IDLE_PAUSE_MS = 2_000;

function useDesignerWideEnough(): boolean {
  // This module is only loaded via dynamic(..., { ssr: false }), so `window`
  // exists on the first client render — no hydration mismatch risk.
  const [wideEnough, setWideEnough] = useState(
    () => window.matchMedia(DESIGNER_WIDE_MQ).matches,
  );

  useEffect(() => {
    const mq = window.matchMedia(DESIGNER_WIDE_MQ);
    const onChange = () => setWideEnough(mq.matches);
    onChange();
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  return wideEnough;
}

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
  const wideEnough = useDesignerWideEnough();
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

  // Below lg: never create a WebGL context (CSS-hiding still mounts GPU memory).
  useEffect(() => {
    if (!wideEnough) onCanvasReady(null);
  }, [onCanvasReady, wideEnough]);

  useEffect(() => {
    if (!wideEnough) return;
    markActive();
  }, [cells, markActive, metrics, wideEnough]);

  useEffect(() => {
    if (!wideEnough) return;
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
  }, [markActive, wideEnough]);

  // Wake the demand frameloop on wheel; scroll locking is OrbitControls' job
  // (bound to gl.domElement with a non-passive wheel listener — see r3f-orbit-controls).
  useEffect(() => {
    if (!wideEnough) return;
    const el = containerRef.current;
    if (!el) return;
    const onWheel = () => {
      markActive();
    };
    el.addEventListener('wheel', onWheel, { passive: true });
    return () => el.removeEventListener('wheel', onWheel);
  }, [markActive, wideEnough]);

  if (!wideEnough) {
    return null;
  }

  return (
    <div
      ref={containerRef}
      // Explicit host size so R3F's resize observer never falls back to 300×150
      // after the sticky/split-pane layout changes available width/height.
      className="designer-canvas-host h-[min(60vh,32rem)] min-h-[18rem] w-full overflow-hidden rounded-[0.75rem] border border-border bg-bg"
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
        style={{ display: 'block', width: '100%', height: '100%' }}
        resize={{ scroll: false, debounce: { scroll: 0, resize: 0 } }}
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
