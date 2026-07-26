import type { ConfigAction } from '@/lib/board-designer/history';
import {
  ROW_TRANSFORM_LABELS,
  ROW_TRANSFORMS,
} from '@/lib/board-designer/row-transform';
import type { BoardDesignConfig, RowStep } from '@/lib/board-designer/types';
import { btnGhost, btnPrimary } from '@/lib/ui';

const inputControl =
  'min-h-[2.75rem] w-full px-[0.75rem] py-0 text-[1rem] text-fg bg-bg border border-border rounded-[0.375rem]';

/** End-grain row pattern editor — dock Pattern tab (Sprint 67 relocate). */
export function RowPatternEditor({
  config,
  dispatch,
  onCommitCoalesce,
}: {
  config: BoardDesignConfig;
  dispatch: (action: ConfigAction) => void;
  onCommitCoalesce: () => void;
}) {
  return (
    <div className="rounded-[0.75rem] border border-border bg-surface p-[1rem]">
      <div className="mb-[0.75rem] flex flex-wrap items-center justify-between gap-[0.75rem]">
        <h2 className="!m-0 text-[1.125rem]">Row pattern</h2>
        <button
          type="button"
          className={btnPrimary}
          disabled={config.rowPattern.length >= 24}
          onClick={() => dispatch({ type: 'add-row' })}
        >
          Add row
        </button>
      </div>

      <label className="mb-[1rem] grid max-w-[12rem] gap-[0.375rem]">
        <span className="text-[0.875rem] font-bold">Rows</span>
        <input
          className={inputControl}
          type="number"
          min={1}
          max={60}
          step={1}
          value={config.rowCount}
          onChange={(event) => {
            const value = Math.round(Number(event.currentTarget.value));
            if (!Number.isFinite(value)) return;
            dispatch({
              type: 'patch',
              patch: { rowCount: Math.min(60, Math.max(1, value)) },
            });
          }}
          onBlur={() => onCommitCoalesce()}
        />
        <span className="text-[0.8125rem] text-muted">
          {config.rowCount} rows from a pattern of {config.rowPattern.length}
        </span>
      </label>

      <ol className="m-0 grid list-none gap-[0.75rem] p-0">
        {config.rowPattern.map((step, index) => (
          <li
            key={`${index}-${step.panelId}-${step.transform}`}
            className="grid gap-[0.5rem] rounded-[0.5rem] border border-border bg-bg p-[0.75rem] sm:grid-cols-[1fr_1fr_auto]"
          >
            <label className="grid gap-[0.375rem]">
              <span className="text-[0.875rem] font-bold">Panel</span>
              <select
                className={inputControl}
                value={step.panelId}
                onChange={(event) =>
                  dispatch({
                    type: 'update-row',
                    index,
                    patch: { panelId: event.currentTarget.value },
                  })
                }
              >
                {config.panels.map((panel) => (
                  <option key={panel.id} value={panel.id}>
                    {panel.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-[0.375rem]">
              <span className="text-[0.875rem] font-bold">Placement</span>
              <select
                className={inputControl}
                value={step.transform}
                onChange={(event) =>
                  dispatch({
                    type: 'update-row',
                    index,
                    patch: {
                      transform: event.currentTarget.value as RowStep['transform'],
                    },
                  })
                }
              >
                {ROW_TRANSFORMS.map((t) => (
                  <option key={t} value={t}>
                    {ROW_TRANSFORM_LABELS[t]}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex items-end">
              <button
                type="button"
                className={btnGhost}
                disabled={config.rowPattern.length <= 1}
                onClick={() => dispatch({ type: 'delete-row', index })}
              >
                Delete row
              </button>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
