'use client';

import { useEffect, useMemo, useReducer, useRef, useState } from 'react';
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
import { clearDraft, loadDraft, saveDraft } from '@/lib/board-designer/draft-store';
import { saveBlockers } from '@/lib/board-designer/save-readiness';
import { parseConfig } from '@/lib/board-designer/serialize';
import type { BoardDesignConfig, Grain } from '@/lib/board-designer/types';
import { btnGhost, btnPrimary } from '@/lib/ui';
import Link from 'next/link';

const SAVE_FORM_ID = 'designer-save-form';
/**
 * "Save a copy" posts this sibling form via the button's `form` attribute (Sprint 81). It used to
 * be a <form> rendered inside the save form — invalid HTML the browser silently repairs, which
 * broke hydration (#418) on every saved-board load.
 */
const COPY_FORM_ID = 'designer-copy-form';

/** JSON with object keys sorted — the parse reorders keys (planeBuffer), so plain JSON would not. */
function canonicalJson(value: unknown): string {
  return JSON.stringify(value, (_key, v: unknown) =>
    v && typeof v === 'object' && !Array.isArray(v)
      ? Object.fromEntries(
          Object.entries(v as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)),
        )
      : v,
  );
}

/**
 * Same design once both are normalised the way the server stores them (planeBuffer default, label
 * trimming) and compared without regard to key order. A saved design comes back from the server in
 * the schema's key order, not the editor's — an order-sensitive check called it "unsaved".
 */
function sameDesign(a: BoardDesignConfig, b: BoardDesignConfig): boolean {
  const pa = parseConfig(a);
  const pb = parseConfig(b);
  return canonicalJson(pa.ok ? pa.config : a) === canonicalJson(pb.ok ? pb.config : b);
}

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
  const dirty = useMemo(() => !sameDesign(config, initialConfig), [config, initialConfig]);
  const formAction = designId ? updateAction : saveAction;
  const undoEnabled = canUndo(history);
  const redoEnabled = canRedo(history);
  // The server's own gate, run first: a config it would reject never gets sent (Sprint 81).
  const blockers = useMemo(() => saveBlockers(config), [config]);
  const canSave = blockers.length === 0;
  const [restoredDraft, setRestoredDraft] = useState(false);

  // Restore an unsaved draft from earlier in this tab. After hydration, once.
  useEffect(() => {
    if (designId) {
      const fresh = loadDraft(null);
      // A "new board" draft identical to this design was just saved as it.
      if (fresh && sameDesign(fresh, initialConfig)) clearDraft(null);
    }
    const draft = loadDraft(designId);
    if (!draft) return;
    if (sameDesign(draft, initialConfig)) {
      clearDraft(designId);
      return;
    }
    dispatch({ type: 'load', config: draft });
    setRestoredDraft(true);
    // Mount only: a later initialConfig (after an update-save) is handled by the persist effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep the draft in step with the design. Skips the mount commit so it cannot clear the draft
  // the restore effect is about to load. initialConfig is a dependency because an update-save
  // redirects to the same URL without remounting: config stays, initialConfig becomes it.
  const persistMounted = useRef(false);
  useEffect(() => {
    if (!persistMounted.current) {
      persistMounted.current = true;
      return;
    }
    if (dirty) saveDraft(designId, config);
    else clearDraft(designId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serializedConfig, initialConfig]);

  // Refresh, close, or leaving the site with unsaved work asks first. In-app navigation is
  // covered by the draft above.
  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [dirty]);

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

  /** Submits the sibling copy form (dirty config JSON + designId, Sprint 72) — never nested. */
  const saveCopyControl =
    designId && copyAction ? (
      <button type="submit" form={COPY_FORM_ID} className={btnGhost} disabled={!canSave}>
        Save a copy
      </button>
    ) : (
      <button type="button" className={btnGhost} disabled title="Save the design first">
        Save a copy
      </button>
    );

  const previewHeaderActions = (
    <>
      {saveCopyControl}
      <button type="submit" form={SAVE_FORM_ID} className={btnPrimary} disabled={!canSave}>
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

        {/* Right action group: shopping list + Build Plan (when saved). */}
        <div className="ml-auto flex flex-wrap items-center gap-[0.5rem]">
          {shoppingListControl}
          {designId ? (
            <Link href={`/designer/${designId}/build`} className={btnGhost}>
              Build Plan
            </Link>
          ) : null}
        </div>
      </div>

      {restoredDraft && (
        <div
          role="status"
          className="flex flex-wrap items-center gap-[0.75rem] rounded-[0.5rem] border border-border bg-surface p-[0.75rem] text-[0.9375rem]"
        >
          <span>Restored unsaved changes from earlier in this tab.</span>
          <button
            type="button"
            className={btnGhost}
            onClick={() => {
              dispatch({ type: 'load', config: initialConfig });
              clearDraft(designId);
              setRestoredDraft(false);
            }}
          >
            Discard them
          </button>
        </div>
      )}

      {dirty && (
        <p className="m-0 hidden text-[0.875rem] text-muted lg:block">Unsaved changes</p>
      )}

      {blockers.length > 0 && (
        <div
          role="alert"
          className="hidden rounded-[0.5rem] border border-danger bg-accent-tint p-[0.75rem] text-[0.9375rem] lg:block"
        >
          <p className="m-0 font-bold">{"Can't save yet:"}</p>
          <ul className="m-0 mt-[0.375rem] grid gap-[0.25rem] pl-[1.25rem]">
            {blockers.map((blocker) => (
              <li key={blocker}>{blocker}</li>
            ))}
          </ul>
        </div>
      )}

      {designId && copyAction ? (
        <form id={COPY_FORM_ID} action={copyAction} hidden>
          <input type="hidden" name="designId" value={designId} />
          <input type="hidden" name="config" value={serializedConfig} />
          <input type="hidden" name="returnTo" value={`/designer/${designId}`} />
        </form>
      ) : null}

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
