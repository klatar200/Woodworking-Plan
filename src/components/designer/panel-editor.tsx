'use client';

import { useMemo, useState } from 'react';
import { StripList } from './strip-list';
import type { ConfigAction } from '@/lib/board-designer/history';
import type { BoardDesignConfig, BoardMetrics, Panel } from '@/lib/board-designer/types';
import { btnGhost, btnPrimary } from '@/lib/ui';

const inputControl =
  'min-h-[2.75rem] w-full px-[0.75rem] py-0 text-[1rem] text-fg bg-bg border border-border rounded-[0.375rem]';

export function PanelEditor({
  config,
  metrics,
  dispatch,
  onCommitCoalesce,
}: {
  config: BoardDesignConfig;
  metrics: BoardMetrics;
  dispatch: (action: ConfigAction) => void;
  onCommitCoalesce: () => void;
}) {
  const [expandedId, setExpandedId] = useState(config.panels[0]?.id ?? '');
  const expanded =
    config.panels.find((p) => p.id === expandedId) ?? config.panels[0] ?? null;

  const rowsByPanel = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of metrics.panelPlan) map.set(p.panelId, p.rows);
    return map;
  }, [metrics.panelPlan]);

  const endGrain = config.grain === 'end';

  return (
    <section className="grid gap-[1rem]">
      <div className="rounded-[0.75rem] border border-border bg-surface p-[1rem]">
        <div className="mb-[0.75rem] flex flex-wrap items-center justify-between gap-[0.75rem]">
          <h2 className="!m-0 text-[1.125rem]">Panels</h2>
          {endGrain && (
            <button
              type="button"
              className={btnPrimary}
              disabled={config.panels.length >= 4}
              onClick={() => {
                dispatch({
                  type: 'add-panel',
                  sourcePanelId: expanded?.id,
                });
              }}
            >
              Add a panel
            </button>
          )}
        </div>

        <div className="grid gap-[0.75rem]">
          {config.panels.map((panel) => {
            const open = expanded?.id === panel.id;
            return (
              <div
                key={panel.id}
                className="rounded-[0.5rem] border border-border bg-bg"
              >
                <PanelHeader
                  panel={panel}
                  open={open}
                  rows={rowsByPanel.get(panel.id) ?? 0}
                  canDelete={config.panels.length > 1}
                  onToggle={() => setExpandedId(panel.id)}
                  onUpdate={(patch) =>
                    dispatch({ type: 'update-panel', id: panel.id, patch })
                  }
                  onDelete={() => dispatch({ type: 'delete-panel', id: panel.id })}
                  onCommitCoalesce={onCommitCoalesce}
                />
                {open && (
                  <div className="border-t border-border p-[0.875rem]">
                    <StripList
                      grain={config.grain}
                      strips={panel.strips}
                      panelThicknessIn={panel.thicknessIn}
                      onAdd={() => dispatch({ type: 'add-strip', panelId: panel.id })}
                      onDuplicate={(id) =>
                        dispatch({ type: 'duplicate-strip', panelId: panel.id, id })
                      }
                      onDelete={(id) =>
                        dispatch({ type: 'delete-strip', panelId: panel.id, id })
                      }
                      onMove={(id, direction) =>
                        dispatch({
                          type: 'move-strip',
                          panelId: panel.id,
                          id,
                          direction,
                        })
                      }
                      onReorder={(fromIndex, toIndex) =>
                        dispatch({
                          type: 'reorder-strip',
                          panelId: panel.id,
                          fromIndex,
                          toIndex,
                        })
                      }
                      onUpdate={(id, patch) =>
                        dispatch({
                          type: 'update-strip',
                          panelId: panel.id,
                          id,
                          patch,
                        })
                      }
                      onCommitCoalesce={onCommitCoalesce}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function PanelHeader({
  panel,
  open,
  rows,
  canDelete,
  onToggle,
  onUpdate,
  onDelete,
  onCommitCoalesce,
}: {
  panel: Panel;
  open: boolean;
  rows: number;
  canDelete: boolean;
  onToggle: () => void;
  onUpdate: (patch: Partial<Pick<Panel, 'label' | 'thicknessIn'>>) => void;
  onDelete: () => void;
  onCommitCoalesce: () => void;
}) {
  return (
    <div className="grid gap-[0.75rem] p-[0.875rem]">
      <div className="flex flex-wrap items-center justify-between gap-[0.5rem]">
        <button
          type="button"
          className={btnGhost}
          aria-expanded={open}
          onClick={onToggle}
        >
          {open ? 'Collapse' : 'Expand'}
        </button>
        <span className="text-[0.875rem] text-muted">
          {rows} {rows === 1 ? 'row' : 'rows'}
        </span>
        <button
          type="button"
          className={btnGhost}
          disabled={!canDelete}
          onClick={onDelete}
        >
          Delete
        </button>
      </div>
      <div className="grid gap-[0.75rem] sm:grid-cols-2">
        <label className="grid gap-[0.375rem]">
          <span className="text-[0.875rem] font-bold">Label</span>
          <input
            className={inputControl}
            maxLength={24}
            value={panel.label}
            onChange={(event) => onUpdate({ label: event.currentTarget.value.slice(0, 24) })}
            onBlur={() => onCommitCoalesce()}
          />
        </label>
        <label className="grid gap-[0.375rem]">
          <span className="text-[0.875rem] font-bold">Thickness</span>
          <input
            className={inputControl}
            type="number"
            min={0.125}
            max={4}
            step={0.0625}
            value={panel.thicknessIn}
            onChange={(event) => {
              const value = Number(event.currentTarget.value);
              if (!Number.isFinite(value)) return;
              onUpdate({
                thicknessIn: Math.min(4, Math.max(0.125, value)),
              });
            }}
            onBlur={() => onCommitCoalesce()}
          />
        </label>
      </div>
    </div>
  );
}

