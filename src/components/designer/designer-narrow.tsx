import Link from 'next/link';
import { BoardDiagram } from './board-diagram';
import { getSpecies } from '@/lib/board-designer/species';
import type { BoardDesignConfig, BoardMetrics } from '@/lib/board-designer/types';
import { formatInches } from '@/lib/format';
import { btnPrimary } from '@/lib/ui';

/** Byte-exact Sprint 54 notices (DECISIONS_LOG 2026-07-26). */
export const DESIGNER_NEW_NARROW_NOTICE =
  'Designing a board needs a wider screen. Your saved boards are available here.';

export const DESIGNER_EDIT_NARROW_NOTICE =
  'Editing needs a wider screen. You can still view this board and its print sheet.';

export const PRINT_SHEET_HINT =
  'Includes the cut list, dimensions and diagram.';

/**
 * Below-lg surface. Always rendered beside the (CSS-hidden) authoring tree so
 * resize does not remount form state. No WebGL here — diagram is SVG only.
 * Strip summary only — shopping-list parts stay Phase 2 / U6 (B7).
 */
export function DesignerNarrowSurface({
  designId,
  config,
  metrics,
}: {
  designId: string | null;
  config: BoardDesignConfig;
  metrics: BoardMetrics;
}) {
  if (!designId) {
    return (
      <section
        className="rounded-[0.75rem] border border-border bg-surface p-[1rem]"
        aria-label="Wider screen required"
      >
        <p className="m-0 mb-[1rem] text-[1rem] text-fg">{DESIGNER_NEW_NARROW_NOTICE}</p>
        <Link href="/designer/library" className={btnPrimary}>
          Your boards
        </Link>
      </section>
    );
  }

  const finished = [
    metrics.finishedLengthIn,
    metrics.finishedWidthIn,
    metrics.finishedThicknessIn,
  ]
    .map(formatInches)
    .join(' × ');

  return (
    <section className="grid gap-[1rem]" aria-label="Board read-only view">
      <div className="rounded-[0.75rem] border border-border bg-surface p-[1rem]">
        <p className="m-0 text-[1rem] text-fg">{DESIGNER_EDIT_NARROW_NOTICE}</p>
      </div>

      <div className="rounded-[0.75rem] border border-border bg-surface p-[1rem]">
        <h2 className="!mt-0 text-[1.125rem]">{config.name}</h2>
        <dl className="m-0 grid gap-[0.5rem] text-[0.9375rem]">
          <div className="flex flex-wrap justify-between gap-[0.5rem]">
            <dt className="text-muted">Grain</dt>
            <dd className="m-0 font-medium">
              {config.grain === 'end' ? 'End grain' : 'Edge grain'}
            </dd>
          </div>
          <div className="flex flex-wrap justify-between gap-[0.5rem]">
            <dt className="text-muted">Finished</dt>
            <dd className="m-0 font-medium">{finished}</dd>
          </div>
        </dl>
      </div>

      <div className="rounded-[0.75rem] border border-border bg-surface p-[1rem]">
        <h2 className="!mt-0 text-[1.125rem]">Board diagram</h2>
        <BoardDiagram config={config} metrics={metrics} />
      </div>

      {config.panels.map((panel) => (
        <div
          key={panel.id}
          className="rounded-[0.75rem] border border-border bg-surface p-[1rem]"
        >
          <h2 className="!mt-0 text-[1.125rem]">{panel.label}</h2>
          <ol className="m-0 grid list-none gap-[0.5rem] p-0">
            {panel.strips.map((strip, index) => (
              <li
                key={strip.id}
                className="flex flex-wrap items-baseline justify-between gap-[0.5rem] border-b border-border pb-[0.5rem] text-[0.9375rem] last:border-b-0 last:pb-0"
              >
                <span>
                  {index + 1}. {getSpecies(strip.speciesId)?.name ?? strip.speciesId}
                </span>
                <span className="text-muted">
                  {formatInches(strip.widthIn)}
                  {strip.repeat > 1 ? ` × ${strip.repeat}` : ''}
                </span>
              </li>
            ))}
          </ol>
        </div>
      ))}

      <div className="rounded-[0.75rem] border border-border bg-surface p-[1rem]">
        <Link href={`/designer/${designId}/print`} className={btnPrimary}>
          Print sheet
        </Link>
        <p className="mt-[0.5rem] mb-0 text-[0.875rem] text-muted">{PRINT_SHEET_HINT}</p>
      </div>

      <p className="m-0">
        <Link href="/designer/library" className="text-[0.9375rem] text-muted underline">
          Your boards
        </Link>
      </p>
    </section>
  );
}
