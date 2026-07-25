import { formatInches } from '@/lib/format';
import type { BoardMetrics } from '@/lib/board-designer/types';

export function MetricsPanel({ metrics }: { metrics: BoardMetrics }) {
  return (
    <section className="rounded-[0.75rem] border border-border bg-surface p-[1rem]">
      <h2 className="!mt-0 text-[1.125rem]">Metrics</h2>

      {metrics.warnings.length > 0 && (
        <div
          role="alert"
          className="mb-[1rem] rounded-[0.5rem] border border-danger bg-accent-tint p-[0.75rem] text-[0.9375rem]"
        >
          <ul className="m-0 grid gap-[0.375rem] pl-[1.25rem]">
            {metrics.warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </div>
      )}

      <dl className="m-0 grid grid-cols-[minmax(0,1fr)_auto] gap-x-[1rem] gap-y-[0.625rem] text-[0.9375rem]">
        <dt className="text-muted">Finished</dt>
        <dd className="m-0 font-bold">
          {formatInches(metrics.finishedLengthIn)} x {formatInches(metrics.finishedWidthIn)} x{' '}
          {formatInches(metrics.finishedThicknessIn)}
        </dd>
        <dt className="text-muted">Glue-up panel</dt>
        <dd className="m-0">
          {formatInches(metrics.panelLengthIn)} x {formatInches(metrics.panelWidthIn)} x{' '}
          {formatInches(metrics.panelThicknessIn)}
        </dd>
        <dt className="text-muted">Slices</dt>
        <dd className="m-0">{metrics.sliceCount}</dd>
        <dt className="text-muted">Leftover length</dt>
        <dd className="m-0">{formatInches(metrics.leftoverIn)}</dd>
        <dt className="text-muted">Total board feet</dt>
        <dd className="m-0">{formatBoardFeet(metrics.totalBoardFeet)} bd ft</dd>
      </dl>

      {metrics.boardFeetBySpecies.length > 0 && (
        <div className="mt-[1rem]">
          <h3 className="m-0 mb-[0.5rem] text-[0.9375rem]">By species</h3>
          <ul className="m-0 grid gap-[0.375rem] pl-[1.25rem] text-[0.875rem] text-muted">
            {metrics.boardFeetBySpecies.map((row) => (
              <li key={row.speciesId}>
                {row.name}: {formatBoardFeet(row.boardFeet)} bd ft
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function formatBoardFeet(value: number): string {
  if (!Number.isFinite(value)) return '0';
  return value.toFixed(value >= 10 ? 1 : 2);
}
