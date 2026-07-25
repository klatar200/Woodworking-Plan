'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { layoutTopFace } from '@/lib/board-designer/layout';
import type { BoardDesignConfig, BoardMetrics } from '@/lib/board-designer/types';
import { btnGhost } from '@/lib/ui';
import { BoardDiagram } from './board-diagram';
import {
  sanitizeBoardFileName,
  shouldUseSvgFallback,
} from './r3f-layout';

const BoardR3FCanvas = dynamic(
  () => import('./r3f-canvas').then((mod) => mod.BoardR3FCanvas),
  { ssr: false },
);

export function BoardPreview(props: {
  config: BoardDesignConfig;
  metrics: BoardMetrics;
}) {
  const { config, metrics } = props;
  const cells = useMemo(() => layoutTopFace(config, metrics), [config, metrics]);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [canvasReady, setCanvasReady] = useState(false);
  const [webglAvailable, setWebglAvailable] = useState<boolean | null>(null);
  const [contextLost, setContextLost] = useState(false);

  useEffect(() => {
    setWebglAvailable(hasWebGL());
  }, []);

  const handleCanvasReady = useCallback((canvas: HTMLCanvasElement | null) => {
    canvasRef.current = canvas;
    setCanvasReady(Boolean(canvas));
  }, []);

  const handleExport = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.toBlob((blob) => {
      if (!blob) return;

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${sanitizeBoardFileName(config.name)}.png`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 0);
    }, 'image/png');
  }, [config.name]);

  const fallbackReason = fallbackReasonFor({
    cellCount: cells.length,
    webglAvailable,
    contextLost,
  });

  return (
    <section className="grid gap-[0.75rem]" aria-label="Board preview">
      <div className="flex justify-end">
        <button
          type="button"
          className={btnGhost}
          onClick={handleExport}
          disabled={!canvasReady}
        >
          Export PNG
        </button>
      </div>
      {fallbackReason ? (
        <PreviewFallback config={config} metrics={metrics} reason={fallbackReason} />
      ) : webglAvailable === null ? (
        <div className="flex min-h-[18rem] items-center justify-center rounded-[0.75rem] border border-border bg-surface text-[0.9375rem] text-muted">
          Loading 3D preview...
        </div>
      ) : (
        <BoardR3FCanvas
          cells={cells}
          metrics={metrics}
          onCanvasReady={handleCanvasReady}
          onContextLost={() => setContextLost(true)}
        />
      )}
    </section>
  );
}

function PreviewFallback({
  config,
  metrics,
  reason,
}: {
  config: BoardDesignConfig;
  metrics: BoardMetrics;
  reason: string;
}) {
  return (
    <div className="grid gap-[0.5rem]">
      <BoardDiagram config={config} metrics={metrics} />
      <p className="m-0 text-[0.9375rem] text-muted">{reason}</p>
    </div>
  );
}

function fallbackReasonFor({
  cellCount,
  webglAvailable,
  contextLost,
}: {
  cellCount: number;
  webglAvailable: boolean | null;
  contextLost: boolean;
}): string | null {
  if (shouldUseSvgFallback(cellCount)) {
    return 'too many pieces for 3D preview';
  }
  if (contextLost) {
    return 'WebGL context lost; showing SVG preview.';
  }
  if (webglAvailable === false) {
    return 'WebGL is unavailable; showing SVG preview.';
  }
  return null;
}

function hasWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return Boolean(
      canvas.getContext('webgl2') ?? canvas.getContext('webgl'),
    );
  } catch {
    return false;
  }
}