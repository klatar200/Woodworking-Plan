'use client';

import type { ConfigAction } from '@/lib/board-designer/history';
import type { BoardDesignConfig, BoardMetrics, Grain } from '@/lib/board-designer/types';
import { btnGhost, btnPrimary } from '@/lib/ui';
import { MetricsPanel } from './metrics-panel';
import { OptimizerPanel } from './optimizer-panel';
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
 * Dock under preview. All panels stay mounted; inactive = hidden (Sprint 67).
 * Badges = Sprint 68 — not here.
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
  const tabs: { id: DesignerDockTab; label: string; show: boolean }[] = [
    { id: 'templates', label: 'Templates', show: true },
    { id: 'pattern', label: 'Pattern', show: endGrain },
    { id: 'metrics', label: 'Metrics', show: true },
    { id: 'cut-plan', label: 'Cut plan', show: true },
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
            </button>
          ) : null,
        )}
      </div>

      <div className="min-h-[12rem] flex-1 overflow-y-auto p-[0.75rem]">
        {/* Keep mounted — hide inactive. Cut plan stock state survives tab switches. */}
        <div
          id="designer-dock-panel-templates"
          role="tabpanel"
          aria-labelledby="designer-dock-tab-templates"
          hidden={tab !== 'templates'}
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
        >
          <MetricsPanel metrics={metrics} grain={config.grain} />
        </div>

        <div
          id="designer-dock-panel-cut-plan"
          role="tabpanel"
          aria-labelledby="designer-dock-tab-cut-plan"
          hidden={tab !== 'cut-plan'}
        >
          <OptimizerPanel config={config} />
        </div>
      </div>
    </section>
  );
}
