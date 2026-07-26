import { layoutTopFace } from '@/lib/board-designer/layout';
import type { BoardDesignConfig, BoardMetrics } from '@/lib/board-designer/types';

const MAX_DRAWN_CELLS = 5_000;

export function BoardDiagram({
  config,
  metrics,
}: {
  config: BoardDesignConfig;
  metrics: BoardMetrics;
}) {
  const cells = layoutTopFace(config, metrics);
  const width = positiveOrOne(metrics.finishedLengthIn);
  const height = positiveOrOne(metrics.finishedWidthIn);

  if (cells.length > MAX_DRAWN_CELLS) {
    return (
      <svg
        role="img"
        aria-label="Board diagram"
        viewBox={`0 0 ${width} ${height}`}
        className="block w-full max-h-[34rem] rounded-[0.75rem] border border-border bg-surface"
      >
        <text
          x={width / 2}
          y={height / 2}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="currentColor"
          className="text-[0.875rem] text-muted"
        >
          too many pieces to draw
        </text>
      </svg>
    );
  }

  return (
    <svg
      role="img"
      aria-label="Board diagram"
      viewBox={`0 0 ${width} ${height}`}
      className="block w-full max-h-[34rem] rounded-[0.75rem] border border-border bg-surface"
    >
      {cells.map((cell, i) => (
        <g key={`${cell.speciesId}-${i}-${cell.xIn}-${cell.yIn}`}>
          <rect
            x={cell.xIn}
            y={cell.yIn}
            width={cell.wIn}
            height={cell.hIn}
            fill={cell.colorHex}
            stroke="var(--border)"
            strokeWidth={0.03}
            vectorEffect="non-scaling-stroke"
          />
          {cell.wedge ? (
            <polygon
              points={cell.wedge.polygon.map(([x, y]) => `${x},${y}`).join(' ')}
              fill={cell.wedge.colorHex}
              stroke="var(--border)"
              strokeWidth={0.03}
              vectorEffect="non-scaling-stroke"
            />
          ) : null}
        </g>
      ))}
    </svg>
  );
}

function positiveOrOne(value: number): number {
  return Number.isFinite(value) && value > 0 ? value : 1;
}
