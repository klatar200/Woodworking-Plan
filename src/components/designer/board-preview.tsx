'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { layoutTopFace } from '@/lib/board-designer/layout';
import type { BoardDesignConfig, BoardMetrics } from '@/lib/board-designer/types';
import { btnGhost, btnPrimary } from '@/lib/ui';
import { BoardDiagram } from './board-diagram';
import {
  sanitizeBoardFileName,
  shouldUseSvgFallback,
} from './r3f-layout';

const BoardR3FCanvas = dynamic(
  () => import('./r3f-canvas').then((mod) => mod.BoardR3FCanvas),
  { ssr: false },
);

type PreviewMode = '3d' | '2d';
type ViewRotation = 0 | 90 | 180 | 270;

const ROTATIONS: ViewRotation[] = [0, 90, 180, 270];

export function BoardPreview(props: {
  config: BoardDesignConfig;
  metrics: BoardMetrics;
}) {
  const { config, metrics } = props;
  const cells = useMemo(() => layoutTopFace(config, metrics), [config, metrics]);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const svgHostRef = useRef<HTMLDivElement | null>(null);
  const [canvasReady, setCanvasReady] = useState(false);
  const [webglAvailable, setWebglAvailable] = useState<boolean | null>(null);
  const [contextLost, setContextLost] = useState(false);
  const [mode, setMode] = useState<PreviewMode>('3d');
  const [rotation, setRotation] = useState<ViewRotation>(0);

  useEffect(() => {
    setWebglAvailable(hasWebGL());
  }, []);

  const handleCanvasReady = useCallback((canvas: HTMLCanvasElement | null) => {
    canvasRef.current = canvas;
    setCanvasReady(Boolean(canvas));
  }, []);

  const fallbackReason = fallbackReasonFor({
    cellCount: cells.length,
    webglAvailable,
    contextLost,
  });

  const show2d = mode === '2d' || Boolean(fallbackReason);

  const exportPng = useCallback(async () => {
    const fileName = `${sanitizeBoardFileName(config.name)}.png`;

    if (!show2d) {
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.toBlob((blob) => {
        if (!blob) return;
        downloadBlob(blob, fileName);
      }, 'image/png');
      return;
    }

    const svg = svgHostRef.current?.querySelector('svg');
    if (!svg) return;
    try {
      const blob = await svgElementToPngBlob(svg, rotation);
      downloadBlob(blob, fileName);
    } catch {
      // Soft fail — button stays enabled; user can retry.
    }
  }, [config.name, rotation, show2d]);

  return (
    <section className="grid gap-[0.75rem]" aria-label="Board preview">
      <div className="flex flex-wrap items-center justify-between gap-[0.75rem]">
        <h2 className="!m-0 text-[1.125rem]">Preview</h2>
        <div className="flex flex-wrap items-center gap-[0.5rem]">
          <div
            role="group"
            aria-label="Preview mode"
            className="flex flex-wrap gap-[0.25rem]"
          >
            <button
              type="button"
              className={mode === '3d' ? btnPrimary : btnGhost}
              aria-pressed={mode === '3d'}
              onClick={() => setMode('3d')}
            >
              3D
            </button>
            <button
              type="button"
              className={mode === '2d' ? btnPrimary : btnGhost}
              aria-pressed={mode === '2d'}
              onClick={() => setMode('2d')}
            >
              2D
            </button>
          </div>
          {show2d ? (
            <div
              role="group"
              aria-label="View rotation"
              className="flex flex-wrap gap-[0.25rem]"
            >
              <button
                type="button"
                className={btnGhost}
                aria-label="Rotate view counter-clockwise"
                onClick={() =>
                  setRotation((r) => ROTATIONS[(ROTATIONS.indexOf(r) + 3) % 4]!)
                }
              >
                Rotate left
              </button>
              <button
                type="button"
                className={btnGhost}
                aria-label="Rotate view clockwise"
                onClick={() =>
                  setRotation((r) => ROTATIONS[(ROTATIONS.indexOf(r) + 1) % 4]!)
                }
              >
                Rotate right
              </button>
              <span className="text-[0.8125rem] text-muted" aria-live="polite">
                {rotation}°
              </span>
            </div>
          ) : null}
          <button
            type="button"
            className={btnGhost}
            onClick={() => void exportPng()}
            disabled={show2d ? false : !canvasReady}
          >
            Export PNG
          </button>
        </div>
      </div>

      {show2d ? (
        <div className="grid gap-[0.5rem]">
          <div
            ref={svgHostRef}
            className="flex min-h-[18rem] items-center justify-center overflow-hidden rounded-[0.75rem] border border-border bg-surface p-[0.75rem]"
          >
            <div
              className="w-full origin-center transition-transform duration-200 motion-reduce:transition-none"
              style={{ transform: `rotate(${rotation}deg)` }}
              data-view-rotation={rotation}
            >
              <BoardDiagram config={config} metrics={metrics} />
            </div>
          </div>
          {fallbackReason && mode === '3d' ? (
            <p className="m-0 text-[0.9375rem] text-muted">{fallbackReason}</p>
          ) : null}
          <p className="m-0 text-[0.8125rem] text-muted">
            Rotation is view-only — it does not change the design.
          </p>
        </div>
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

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

async function svgElementToPngBlob(
  svg: SVGSVGElement,
  rotation: ViewRotation,
): Promise<Blob> {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  const width = Math.max(1, svg.viewBox.baseVal.width || svg.clientWidth || 512);
  const height = Math.max(1, svg.viewBox.baseVal.height || svg.clientHeight || 512);
  const scale = 4;
  const swapped = rotation === 90 || rotation === 270;
  const outW = Math.round((swapped ? height : width) * scale);
  const outH = Math.round((swapped ? width : height) * scale);

  clone.setAttribute('width', String(width * scale));
  clone.setAttribute('height', String(height * scale));
  const xml = new XMLSerializer().serializeToString(clone);
  const url = URL.createObjectURL(
    new Blob([xml], { type: 'image/svg+xml;charset=utf-8' }),
  );

  try {
    const image = await loadImage(url);
    const canvas = document.createElement('canvas');
    canvas.width = outW;
    canvas.height = outH;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('no-2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, outW, outH);
    ctx.translate(outW / 2, outH / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.drawImage(
      image,
      (-width * scale) / 2,
      (-height * scale) / 2,
      width * scale,
      height * scale,
    );
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/png'),
    );
    if (!blob) throw new Error('png-failed');
    return blob;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('image-load'));
    image.src = url;
  });
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
