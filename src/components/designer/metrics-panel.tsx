import { formatInches, formatBoardFeet } from '@/lib/format';
import type { BoardMetrics, Grain } from '@/lib/board-designer/types';

export function MetricsPanel({
  metrics,
  grain,
}: {
  metrics: BoardMetrics;
  grain: Grain;
}) {
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
        <dt className="text-muted">Total board feet</dt>
        <dd className="m-0">{formatBoardFeet(metrics.totalBoardFeet)} bd ft</dd>
      </dl>

      <div className="mt-[1rem]">
        <h3 className="m-0 mb-[0.5rem] text-[0.9375rem]">Panels</h3>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-[0.875rem]">
            <thead>
              <tr className="border-b border-border text-muted">
                <th className="py-[0.375rem] pr-[0.5rem] font-medium">Panel</th>
                <th className="py-[0.375rem] pr-[0.5rem] font-medium">Size</th>
                <th className="py-[0.375rem] pr-[0.5rem] font-medium">Rows</th>
                <th className="py-[0.375rem] font-medium">Required length</th>
              </tr>
            </thead>
            <tbody>
              {metrics.panelPlan.map((plan) => (
                <tr key={plan.panelId} className="border-b border-border last:border-b-0">
                  <td className="py-[0.5rem] pr-[0.5rem]">{plan.label}</td>
                  <td className="py-[0.5rem] pr-[0.5rem]">
                    {formatInches(plan.widthIn)} × {formatInches(plan.thicknessIn)}
                  </td>
                  <td className="py-[0.5rem] pr-[0.5rem]">{plan.rows}</td>
                  <td className="py-[0.5rem]">{formatInches(plan.requiredLengthIn)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {grain === 'end' && (
          <p className="mt-[0.5rem] mb-0 text-[0.8125rem] text-muted">
            {metrics.sliceCount} slices on the finished face
          </p>
        )}
      </div>

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
