'use client';

import { useMemo, useState } from 'react';
import type { ConfigAction } from '@/lib/board-designer/history';
import type { BoardDesignConfig, BoardMetrics, Grain } from '@/lib/board-designer/types';
import { DEFAULT_OPTIONS } from '@/lib/cut-optimizer';
import { btnGhost, btnPrimary } from '@/lib/ui';
import { MetricsPanel } from './metrics-panel';
import { cutPlanHasImpossible, OptimizerPanel } from './optimizer-panel';
import { RowPatternEditor } from './row-pattern-editor';
import { TemplatePicker } from './template-picker';

export type DesignerDockTab = 'templates' | 'pattern' | 'metrics' | 'cut-plan';

export function defaultDockTab(grain: Grain): DesignerDockTab {
  return grain === 'end' ? 'pattern' : 'templates';
}

/** Resolve tab when grain changes — edge hides Pattern (Sprint 67). */
export function dockTabForGrain(
  grain: Grain,
  current: DesignerDockTab,
): DesignerDockTab {
  if (grain === 'edge' && current === 'pattern') return 'templates';
  return current;
}

/**
 * Dock under preview. All panels stay mounted; inactive = hidden.
 * Sprint 68: tab badges for Metrics warnings / Cut plan impossible.
 */
export function DesignerDock({
  tab,
  onTabChange,
  config,
  metrics,
  dispatch,
  onCommitCoalesce,
}: {
  tab: DesignerDockTab;
  onTabChange: (tab: DesignerDockTab) => void;
  config: BoardDesignConfig;
  metrics: BoardMetrics;
  dispatch: (action: ConfigAction) => void;
  onCommitCoalesce: () => void;
}) {
  const endGrain = config.grain === 'end';
  const metricsBadge = metrics.warnings.length > 0;
  // Stock lives here so the tab badge matches the panel (not default-only).
  const [stockLengthIn, setStockLengthIn] = useState(DEFAULT_OPTIONS.stockLengthIn);
  const [stockWidthIn, setStockWidthIn] = useState<number | null>(null);
  const cutPlanBadge = useMemo(
    () => cutPlanHasImpossible(config, { stockLengthIn, stockWidthIn }),
    [config, stockLengthIn, stockWidthIn],
  );

  const tabs: {
    id: DesignerDockTab;
    label: string;
    show: boolean;
    badge: boolean;
  }[] = [
    { id: 'templates', label: 'Templates', show: true, badge: false },
    { id: 'pattern', label: 'Pattern', show: endGrain, badge: false },
    { id: 'metrics', label: 'Metrics', show: true, badge: metricsBadge },
    { id: 'cut-plan', label: 'Cut plan', show: true, badge: cutPlanBadge },
  ];

  return (
    <section
      className="flex h-full min-h-[12rem] flex-col rounded-[0.75rem] border border-border bg-surface"
      aria-label="Designer dock"
    >
      <div
        role="tablist"
        aria-label="Designer panels"
        className="flex flex-wrap gap-[0.25rem] border-b border-border p-[0.5rem]"
      >
        {tabs.map((item) =>
          item.show ? (
            <button
              key={item.id}
              type="button"
              role="tab"
              id={`designer-dock-tab-${item.id}`}
              aria-selected={tab === item.id}
              aria-controls={`designer-dock-panel-${item.id}`}
              className={tab === item.id ? btnPrimary : btnGhost}
              onClick={() => onTabChange(item.id)}
            >
              {item.label}
              {item.badge ? (
                <span
                  className="ml-[0.375rem] inline-block h-[0.5rem] w-[0.5rem] rounded-[999px] bg-danger"
                  aria-label="Needs attention"
                />
              ) : null}
            </button>
          ) : null,
        )}
      </div>

      <div className="min-h-[12rem] flex-1 overflow-y-auto p-[0.75rem]">
        <div
          id="designer-dock-panel-templates"
          role="tabpanel"
          aria-labelledby="designer-dock-tab-templates"
          hidden={tab !== 'templates'}
          data-dock-panel="templates"
        >
          <TemplatePicker
            onLoad={(templateConfig) =>
              dispatch({ type: 'load', config: templateConfig })
            }
          />
        </div>

        <div
          id="designer-dock-panel-pattern"
          role="tabpanel"
          aria-labelledby="designer-dock-tab-pattern"
          hidden={tab !== 'pattern' || !endGrain}
          data-dock-panel="pattern"
        >
          <RowPatternEditor
            config={config}
            dispatch={dispatch}
            onCommitCoalesce={onCommitCoalesce}
          />
        </div>

        <div
          id="designer-dock-panel-metrics"
          role="tabpanel"
          aria-labelledby="designer-dock-tab-metrics"
          hidden={tab !== 'metrics'}
          data-dock-panel="metrics"
        >
          <MetricsPanel metrics={metrics} grain={config.grain} />
        </div>

        <div
          id="designer-dock-panel-cut-plan"
          role="tabpanel"
          aria-labelledby="designer-dock-tab-cut-plan"
          hidden={tab !== 'cut-plan'}
          data-dock-panel="cut-plan"
        >
          <OptimizerPanel
            config={config}
            stockLengthIn={stockLengthIn}
            stockWidthIn={stockWidthIn}
            onStockLengthChange={setStockLengthIn}
            onStockWidthChange={setStockWidthIn}
          />
        </div>
      </div>
    </section>
  );
}
