import { formatInches } from '@/lib/format';
import {
  layoutParts,
  describeDiagram,
  DEFAULT_LAYOUT,
  type DiagramPart,
  type LayoutOptions,
} from '@/lib/part-diagram';

interface Props {
  parts: DiagramPart[];
  /**
   * Cut-list row ids to draw as highlighted — QOL-G item 2. Prop-driven on purpose:
   * this component knows how to SHOW a highlight, and nothing about which parts belong
   * to which step. See the pilot page for why that link does not exist yet.
   */
  highlightPartIds?: readonly string[];
  options?: LayoutOptions;
}

/**
 * A generated part diagram — QOL-G pilot (2026-07-19). **Not used by any live page.**
 *
 * Pure computation off `cutList`, which every published plan already carries: no artwork,
 * no per-plan asset, nothing to author. See `src/lib/part-diagram.ts` for the layout and
 * for why this is deliberately not the cut-list optimizer and not an assembly view.
 *
 * ACCESSIBILITY. The SVG is `role="img"` with a `<title>`, a `<desc>` and an `aria-label`
 * enumerating every part and its real dimensions — an SVG with no text alternative is a
 * picture some readers simply do not receive. The cut-list TABLE stays the authoritative
 * presentation of this data; this is an addition to it. That is not a hedge, it is the
 * reason the pilot page renders both side by side.
 *
 * COLOURS are existing tokens only. Dimensions print as tape-measure fractions via
 * `formatInches` — the standing rule (13/16″, never 0.8125″) applies to a drawing exactly
 * as it applies to the table.
 */
export function PartDiagram({ parts, highlightPartIds = [], options = DEFAULT_LAYOUT }: Props) {
  const diagram = layoutParts(parts, options);
  const highlighted = new Set(highlightPartIds);
  const isHighlighting = highlighted.size > 0;

  if (diagram.parts.length === 0) {
    return (
      <p className="muted small">
        No drawable parts.
        {diagram.skipped.length > 0
          ? ` ${diagram.skipped.length} cut-list row(s) had unusable dimensions.`
          : ''}
      </p>
    );
  }

  const description = describeDiagram(diagram);

  return (
    <figure className="m-0">
      <svg
        viewBox={`0 0 ${diagram.width} ${diagram.height}`}
        width="100%"
        height={diagram.height}
        role="img"
        aria-label={description}
        className="max-w-full h-auto"
      >
        <title>Parts drawn to scale</title>
        <desc>{description}</desc>

        {diagram.parts.map((part) => {
          const dim = !isHighlighting || highlighted.has(part.partId);
          // A label only fits inside a rectangle that is actually big enough for it;
          // otherwise it renders as overlapping soup and the drawing gets less legible
          // the more parts it has.
          const showLabel = part.w > 64 && part.h > 16;

          return (
            <g key={part.key} opacity={dim ? 1 : 0.28}>
              <rect
                x={part.x}
                y={part.y}
                width={part.w}
                height={part.h}
                rx={2}
                fill={
                  isHighlighting && highlighted.has(part.partId)
                    ? 'var(--accent)'
                    : 'var(--accent-tint)'
                }
                stroke={
                  isHighlighting && highlighted.has(part.partId)
                    ? 'var(--accent-strong)'
                    : 'var(--border-strong)'
                }
                strokeWidth={isHighlighting && highlighted.has(part.partId) ? 2 : 1}
              />
              {showLabel ? (
                <text
                  x={part.x + 6}
                  y={part.y + 14}
                  fontSize="11"
                  fill="var(--fg)"
                  // The SVG inherits the page font; naming a family here would be the one
                  // place in the app that hardcodes typography.
                  fontFamily="inherit"
                >
                  {part.label}
                  {part.standsForMore ? ` ×${part.quantity}` : ''}
                </text>
              ) : null}
              {showLabel && part.h > 30 ? (
                <text
                  x={part.x + 6}
                  y={part.y + 28}
                  fontSize="10"
                  fill="var(--muted)"
                  fontFamily="inherit"
                >
                  {formatInches(part.thicknessIn)} × {formatInches(part.widthIn)} ×{' '}
                  {formatInches(part.lengthIn)}
                </text>
              ) : null}
            </g>
          );
        })}
      </svg>

      {/* Reported, never silent — a part that vanished from the drawing must say so. */}
      {diagram.skipped.length > 0 ? (
        <figcaption className="muted small mt-[0.5rem]">
          Not drawn ({diagram.skipped.length}):{' '}
          {diagram.skipped.map((s) => s.label).join(', ')} &mdash; unusable dimensions in
          the cut list.
        </figcaption>
      ) : null}
    </figure>
  );
}
