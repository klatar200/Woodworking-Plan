'use client';

import { useMemo, useState } from 'react';
import { StripList } from './strip-list';
import { BoundedNumberInput } from './bounded-number-input';
import {
  MAX_STRIPS_PER_PANEL,
  MAX_STRIPS_TOTAL,
} from '@/lib/board-designer/config-limits';
import type { ConfigAction } from '@/lib/board-designer/history';
import { formatInches } from '@/lib/format';
import type { BoardDesignConfig, BoardMetrics, Panel } from '@/lib/board-designer/types';
import { btnDanger, btnGhost, btnPrimary } from '@/lib/ui';
import { FieldHint } from './field-hint';

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
  // null = the user collapsed it (Sprint 81). An id that no longer matches a panel — a template
  // load, a restored draft, a deleted panel — falls back to the first panel, as before.
  const [expandedId, setExpandedId] = useState<string | null>(config.panels[0]?.id ?? null);
  const expanded =
    expandedId === null
      ? null
      : (config.panels.find((p) => p.id === expandedId) ?? config.panels[0] ?? null);

  const totalStrips = config.panels.reduce((sum, p) => sum + p.strips.length, 0);
  // add-panel copies the expanded panel, or the last one when none is expanded (reducer fallback).
  const panelToCopy = expanded ?? config.panels[config.panels.length - 1] ?? null;
  const canAddPanel =
    config.panels.length < 4 &&
    totalStrips + (panelToCopy?.strips.length ?? 0) <= MAX_STRIPS_TOTAL;

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
              disabled={!canAddPanel}
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
                  onToggle={() => setExpandedId(open ? null : panel.id)}
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
                      canAdd={
                        panel.strips.length < MAX_STRIPS_PER_PANEL &&
                        totalStrips < MAX_STRIPS_TOTAL
                      }
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
        <span className="text-[0.875rem] text-muted">
          {rows} {rows === 1 ? 'row' : 'rows'}
        </span>
        <div className="flex flex-wrap items-center gap-[0.5rem]">
          <button
            type="button"
            className={btnGhost}
            aria-expanded={open}
            onClick={onToggle}
          >
            {open ? 'Collapse' : 'Expand'}
          </button>
          <button
            type="button"
            className={btnDanger}
            aria-label={`Delete ${panel.label}`}
            disabled={!canDelete}
            onClick={onDelete}
          >
            Delete
          </button>
        </div>
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
          <span className="text-[0.875rem] font-bold">Thickness (in)</span>
          <FieldHint>Panel thickness in inches.</FieldHint>
          <BoundedNumberInput
            className={inputControl}
            min={0.125}
            max={4}
            step={0.0625}
            formatBound={formatInches}
            value={panel.thicknessIn}
            onValue={(thicknessIn) => onUpdate({ thicknessIn })}
            onCommit={onCommitCoalesce}
          />
        </label>
      </div>
    </div>
  );
}

