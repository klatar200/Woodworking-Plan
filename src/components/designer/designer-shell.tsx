'use client';

import { useEffect, useMemo, useReducer } from 'react';
import { BoardPreview } from './board-preview';
import { BoardSettings } from './board-settings';
import { DesignerNarrowSurface } from './designer-narrow';
import { MetricsPanel } from './metrics-panel';
import { DESIGNER_WIDE_MQ } from '@/lib/board-designer/viewport';
import { StripList } from './strip-list';
import { TemplatePicker } from './template-picker';
import { calculateMetrics } from '@/lib/board-designer/metrics';
import {
  canRedo,
  canUndo,
  createHistoryState,
  historyReducer,
  undoRedoShortcut,
} from '@/lib/board-designer/history';
import type { BoardDesignConfig } from '@/lib/board-designer/types';
import { btnGhost, btnPrimary } from '@/lib/ui';

function isTextEntryTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  return target.isContentEditable;
}

export function DesignerShell(props: {
  designId: string | null;
  initialConfig: BoardDesignConfig;
  saveAction: (fd: FormData) => Promise<void>;
  updateAction: (fd: FormData) => Promise<void>;
}) {
  const { designId, initialConfig, saveAction, updateAction } = props;
  const [history, dispatch] = useReducer(historyReducer, initialConfig, createHistoryState);
  const config = history.present;
  const metrics = useMemo(() => calculateMetrics(config), [config]);
  const serializedConfig = useMemo(() => JSON.stringify(config), [config]);
  const dirty = serializedConfig !== JSON.stringify(initialConfig);
  const formAction = designId ? updateAction : saveAction;
  const undoEnabled = canUndo(history);
  const redoEnabled = canRedo(history);

  useEffect(() => {
    const mq = window.matchMedia(DESIGNER_WIDE_MQ);
    const onKeyDown = (event: KeyboardEvent) => {
      if (!mq.matches) return;
      if (isTextEntryTarget(event.target)) return;
      // Mapping lives in history.ts so the case-folding is unit-tested — real
      // hardware sends 'Z' for Shift+Z, synthesized events send 'z'.
      const intent = undoRedoShortcut(event);
      if (!intent) return;

      event.preventDefault();
      dispatch({ type: intent });
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <form action={formAction} className="grid gap-[1.25rem]">
      {designId && <input type="hidden" name="designId" value={designId} />}
      <input type="hidden" name="config" value={serializedConfig} />

      {/* Narrow surface: CSS-shown below lg. Authoring tree stays mounted (max-lg:hidden)
          so a resize / rotate with an unsaved draft does not destroy in-memory state. */}
      <div className="lg:hidden">
        <h1 className="m-0 mb-[1rem]">Board designer</h1>
        <DesignerNarrowSurface
          designId={designId}
          config={config}
          metrics={metrics}
        />
      </div>

      {/* Authoring chrome — always in the React tree; display:none below lg. */}
      <div className="hidden lg:grid lg:gap-[1.25rem]">
        <div className="flex flex-wrap items-start justify-between gap-[1rem]">
          <div>
            <h1 className="m-0">Board designer</h1>
          </div>
          <div className="flex flex-wrap gap-[0.5rem]">
            <button
              type="button"
              className={btnGhost}
              disabled={!undoEnabled}
              onClick={() => dispatch({ type: 'undo' })}
            >
              Undo
            </button>
            <button
              type="button"
              className={btnGhost}
              disabled={!redoEnabled}
              onClick={() => dispatch({ type: 'redo' })}
            >
              Redo
            </button>
            <button
              type="button"
              className={btnGhost}
              onClick={() => dispatch({ type: 'load', config: initialConfig })}
            >
              Reset
            </button>
            <button type="submit" className={btnPrimary}>
              Save
            </button>
          </div>
        </div>

        {dirty && <p className="m-0 text-[0.875rem] text-muted">Unsaved changes</p>}

        {/* Preview column takes slack; settings rail stays readable. Sticky preview
            so strip/settings edits never require scrolling back up to see the board.
            The columns MUST stay stretched: a sticky element can only travel inside
            its own containing block, so `items-start` would shrink-wrap this column
            to its content and the preview would scroll away after ~130px of a
            ~6700px page. `content-start` keeps the children at their natural height
            inside the now-full-height column. */}
        <div className="grid gap-[1.25rem] lg:grid-cols-[minmax(0,1fr)_minmax(20rem,26rem)]">
          <div className="grid min-w-0 gap-[1rem] lg:content-start">
            <section className="rounded-[0.75rem] border border-border bg-surface p-[1rem] lg:sticky lg:top-[4.5rem] lg:z-[1] lg:max-h-[calc(100vh-5.25rem)] lg:overflow-y-auto">
              <BoardPreview config={config} metrics={metrics} />
            </section>
            <TemplatePicker
              onLoad={(templateConfig) => dispatch({ type: 'load', config: templateConfig })}
            />
          </div>

          <div className="grid min-w-0 gap-[1rem]">
            <BoardSettings
              config={config}
              onChange={(patch) => dispatch({ type: 'patch', patch })}
              onCommitCoalesce={() => dispatch({ type: 'commit-coalesce' })}
            />
            <StripList
              grain={config.grain}
              strips={config.strips}
              onAdd={() => dispatch({ type: 'add-strip' })}
              onDuplicate={(id) => dispatch({ type: 'duplicate-strip', id })}
              onDelete={(id) => dispatch({ type: 'delete-strip', id })}
              onMove={(id, direction) => dispatch({ type: 'move-strip', id, direction })}
              onUpdate={(id, patch) => dispatch({ type: 'update-strip', id, patch })}
              onCommitCoalesce={() => dispatch({ type: 'commit-coalesce' })}
            />
            <MetricsPanel metrics={metrics} grain={config.grain} />
          </div>
        </div>
      </div>
    </form>
  );
}
