import {
  placeholderLabel,
  thumbModelFromStored,
  type ThumbModel,
} from '@/lib/board-designer/library-thumb';

/**
 * Inline SVG thumbnail for `/designer/library` — rendered from config at request
 * time. No stored image, no R2, no upload path.
 */
export function DesignThumbnail({
  name,
  configJson,
}: {
  name: string;
  configJson: unknown;
}) {
  const model = thumbModelFromStored(configJson);
  return <ThumbSvg name={name} model={model} />;
}

function ThumbSvg({ name, model }: { name: string; model: ThumbModel }) {
  if (model.kind !== 'ok') {
    return (
      <div
        className="flex aspect-[4/3] w-full max-w-[11rem] items-center justify-center rounded-[0.5rem] border border-border bg-bg px-[0.5rem] text-center text-[0.75rem] text-muted shadow-e1"
        role="img"
        aria-label={`${name}: ${placeholderLabel(model.reason)}`}
      >
        {placeholderLabel(model.reason)}
      </div>
    );
  }

  const { cells, widthIn, heightIn } = model;

  return (
    <svg
      role="img"
      aria-label={`${name} board preview`}
      viewBox={`0 0 ${widthIn} ${heightIn}`}
      className="block aspect-[4/3] w-full max-w-[11rem] rounded-[0.5rem] border border-border bg-surface shadow-e1"
      preserveAspectRatio="xMidYMid meet"
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
            strokeWidth={0.04}
            vectorEffect="non-scaling-stroke"
          />
          {cell.wedge ? (
            <polygon
              points={cell.wedge.polygon.map(([x, y]) => `${x},${y}`).join(' ')}
              fill={cell.wedge.colorHex}
              stroke="var(--border)"
              strokeWidth={0.04}
              vectorEffect="non-scaling-stroke"
            />
          ) : null}
        </g>
      ))}
    </svg>
  );
}
