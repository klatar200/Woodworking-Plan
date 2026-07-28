'use client';

import { useEffect, useMemo, useReducer, useState } from 'react';
import { BoardPreview } from './board-preview';
import { BoardSettingsDisclosure } from './board-settings';
import {
  DesignerDock,
  defaultDockTab,
  dockTabForGrain,
  type DesignerDockTab,
} from './designer-dock';
import { DesignerNarrowSurface } from './designer-narrow';
import { DESIGNER_WIDE_MQ } from '@/lib/board-designer/viewport';
import { PanelEditor } from './panel-editor';
import { calculateMetrics } from '@/lib/board-designer/metrics';
import {
  canRedo,
  canUndo,
  createHistoryState,
  historyReducer,
  undoRedoShortcut,
} from '@/lib/board-designer/history';
import type { BoardDesignConfig, Grain } from '@/lib/board-designer/types';
import { btnGhost, btnPrimary } from '@/lib/ui';

const SAVE_FORM_ID = 'designer-save-form';

const inputControl =
  'min-h-[2.75rem] min-w-[12rem] flex-1 px-[0.75rem] py-0 text-[1rem] text-fg bg-bg border border-border rounded-[0.375rem]';

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
  copyAction?: (fd: FormData) => Promise<void>;
  addToShoppingListAction?: (fd: FormData) => Promise<void>;
}) {
  const {
    designId,
    initialConfig,
    saveAction,
    updateAction,
    copyAction,
    addToShoppingListAction,
  } = props;
  const [history, dispatch] = useReducer(historyReducer, initialConfig, createHistoryState);
  const config = history.present;
  const metrics = useMemo(() => calculateMetrics(config), [config]);
  const serializedConfig = useMemo(() => JSON.stringify(config), [config]);
  const dirty = serializedConfig !== JSON.stringify(initialConfig);
  const formAction = designId ? updateAction : saveAction;
  const undoEnabled = canUndo(history);
  const redoEnabled = canRedo(history);

  const [dockTab, setDockTab] = useState<DesignerDockTab>(() =>
    defaultDockTab(initialConfig.grain),
  );

  // Template load / undo / redo / reset can change grain without the top-bar
  // toggle — keep Pattern→Templates in sync whenever present.grain is edge.
  useEffect(() => {
    setDockTab((current) => dockTabForGrain(config.grain, current));
  }, [config.grain]);

  useEffect(() => {
    const mq = window.matchMedia(DESIGNER_WIDE_MQ);
    const onKeyDown = (event: KeyboardEvent) => {
      if (!mq.matches) return;
      if (isTextEntryTarget(event.target)) return;
      const intent = undoRedoShortcut(event);
      if (!intent) return;

      event.preventDefault();
      dispatch({ type: intent });
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const patchConfig = (patch: Partial<BoardDesignConfig>) => {
    dispatch({ type: 'patch', patch });
  };

  const setGrain = (grain: Grain) => {
    patchConfig({ grain });
  };

  const shoppingListControl =
    designId && addToShoppingListAction ? (
      <form action={addToShoppingListAction}>
        <input type="hidden" name="designId" value={designId} />
        <input type="hidden" name="returnTo" value={`/designer/${designId}`} />
        <button type="submit" className={btnGhost}>
          Add to shopping list
        </button>
      </form>
    ) : null;

  /** Sibling form — posts dirty config JSON + designId (Sprint 72). */
  const saveCopyControl =
    designId && copyAction ? (
      <form action={copyAction}>
        <input type="hidden" name="designId" value={designId} />
        <input type="hidden" name="config" value={serializedConfig} />
        <input type="hidden" name="returnTo" value={`/designer/${designId}`} />
        <button type="submit" className={btnGhost}>
          Save a copy
        </button>
      </form>
    ) : (
      <button type="button" className={btnGhost} disabled title="Save the design first">
        Save a copy
      </button>
    );

  const previewHeaderActions = (
    <>
      {saveCopyControl}
      <button type="submit" form={SAVE_FORM_ID} className={btnPrimary}>
        Save
      </button>
    </>
  );

  return (
    <div className="grid gap-[1.25rem]">
      {/* Top bar outside save form so shopping/copy stay sibling forms (no nest). */}
      <div className="hidden lg:flex lg:flex-wrap lg:items-center lg:gap-[0.75rem]">
        <BoardSettingsDisclosure
          config={config}
          metrics={metrics}
          onChange={patchConfig}
          onGrainChange={setGrain}
          onCommitCoalesce={() => dispatch({ type: 'commit-coalesce' })}
        />

        <label className="grid min-w-[12rem] flex-[1_1_14rem] gap-[0.25rem]">
          <span className="sr-only">Board name</span>
          <input
            className={inputControl}
            value={config.name}
            maxLength={80}
            aria-label="Board name"
            onChange={(event) => patchConfig({ name: event.currentTarget.value })}
            onBlur={() => dispatch({ type: 'commit-coalesce' })}
          />
        </label>

        <div
          role="group"
          aria-label="History"
          className="flex flex-wrap items-center gap-[0.5rem]"
        >
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
        </div>

        {/* Right action group: shopping only this sprint; structured for a second child later. */}
        <div className="ml-auto flex flex-wrap items-center gap-[0.5rem]">
          {shoppingListControl}
        </div>
      </div>

      {dirty && (
        <p className="m-0 hidden text-[0.875rem] text-muted lg:block">Unsaved changes</p>
      )}

      <form
        id={SAVE_FORM_ID}
        action={formAction}
        className="grid gap-[1.25rem]"
      >
        {designId && <input type="hidden" name="designId" value={designId} />}
        <input type="hidden" name="config" value={serializedConfig} />

        <div className="lg:hidden">
          <h1 className="m-0 mb-[1rem]">Board designer</h1>
          <DesignerNarrowSurface
            designId={designId}
            config={config}
            metrics={metrics}
          />
        </div>

        {/*
          Panels left, preview right (Sprint 76). Sticky preview + dock stays;
          preview card grows with its render (no vh cap / inner scroll).
          Do not use items-start on this grid (sticky containing-block trap — Sprint 53).
        */}
        <div className="hidden lg:grid lg:grid-cols-[minmax(20rem,1fr)_minmax(0,1200px)] lg:gap-[1.25rem] lg:content-start">
          <div className="grid min-w-0 gap-[1rem] lg:content-start">
            <PanelEditor
              config={config}
              metrics={metrics}
              dispatch={dispatch}
              onCommitCoalesce={() => dispatch({ type: 'commit-coalesce' })}
            />
          </div>

          <div className="flex min-w-0 flex-col gap-[1rem] lg:sticky lg:top-[4.5rem] lg:z-[1]">
            <BoardPreview
              config={config}
              metrics={metrics}
              headerActions={previewHeaderActions}
            />
            <div className="flex min-h-[12rem] min-w-0 flex-1 flex-col overflow-hidden">
              <DesignerDock
                tab={dockTab}
                onTabChange={setDockTab}
                config={config}
                metrics={metrics}
                dispatch={dispatch}
                onCommitCoalesce={() => dispatch({ type: 'commit-coalesce' })}
              />
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
