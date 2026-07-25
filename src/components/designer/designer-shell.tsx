'use client';

import { useMemo, useReducer } from 'react';
import { BoardPreview } from './board-preview';
import { BoardSettings } from './board-settings';
import { MetricsPanel } from './metrics-panel';
import { StripList } from './strip-list';
import { TemplatePicker } from './template-picker';
import { calculateMetrics } from '@/lib/board-designer/metrics';
import type { BoardDesignConfig, Strip } from '@/lib/board-designer/types';
import { btnGhost, btnPrimary } from '@/lib/ui';

type Action =
  | { type: 'load'; config: BoardDesignConfig }
  | { type: 'patch'; patch: Partial<BoardDesignConfig> }
  | { type: 'add-strip' }
  | { type: 'duplicate-strip'; id: string }
  | { type: 'delete-strip'; id: string }
  | { type: 'move-strip'; id: string; direction: -1 | 1 }
  | { type: 'update-strip'; id: string; patch: Partial<Strip> };

export function DesignerShell(props: {
  designId: string | null;
  initialConfig: BoardDesignConfig;
  saveAction: (fd: FormData) => Promise<void>;
  updateAction: (fd: FormData) => Promise<void>;
}) {
  const { designId, initialConfig, saveAction, updateAction } = props;
  const [config, dispatch] = useReducer(reducer, initialConfig, cloneConfig);
  const metrics = useMemo(() => calculateMetrics(config), [config]);
  const serializedConfig = useMemo(() => JSON.stringify(config), [config]);
  const dirty = serializedConfig !== JSON.stringify(initialConfig);
  const formAction = designId ? updateAction : saveAction;

  return (
    <form action={formAction} className="grid gap-[1.25rem]">
      {designId && <input type="hidden" name="designId" value={designId} />}
      <input type="hidden" name="config" value={serializedConfig} />

      <div className="flex flex-wrap items-start justify-between gap-[1rem]">
        <div>
          <h1 className="m-0">Board designer</h1>
        </div>
        <div className="flex flex-wrap gap-[0.5rem]">
          <button type="button" className={btnGhost} onClick={() => dispatch({ type: 'load', config: initialConfig })}>
            Reset
          </button>
          <button type="submit" className={btnPrimary}>
            Save
          </button>
        </div>
      </div>

      {dirty && <p className="m-0 text-[0.875rem] text-muted">Unsaved changes</p>}

      <div className="grid gap-[1.25rem] lg:grid-cols-[minmax(0,1fr)_26rem] lg:items-start">
        <div className="grid gap-[1rem]">
          <section className="rounded-[0.75rem] border border-border bg-surface p-[1rem]">
            <h2 className="!mt-0 text-[1.125rem]">Preview</h2>
            <BoardPreview config={config} metrics={metrics} />
          </section>
          <TemplatePicker
            dirty={dirty}
            onLoad={(templateConfig) => dispatch({ type: 'load', config: templateConfig })}
          />
        </div>

        <div className="grid gap-[1rem]">
          <BoardSettings
            config={config}
            onChange={(patch) => dispatch({ type: 'patch', patch })}
          />
          <StripList
            strips={config.strips}
            onAdd={() => dispatch({ type: 'add-strip' })}
            onDuplicate={(id) => dispatch({ type: 'duplicate-strip', id })}
            onDelete={(id) => dispatch({ type: 'delete-strip', id })}
            onMove={(id, direction) => dispatch({ type: 'move-strip', id, direction })}
            onUpdate={(id, patch) => dispatch({ type: 'update-strip', id, patch })}
          />
          <MetricsPanel metrics={metrics} />
        </div>
      </div>
    </form>
  );
}

function reducer(config: BoardDesignConfig, action: Action): BoardDesignConfig {
  switch (action.type) {
    case 'load':
      return cloneConfig(action.config);
    case 'patch':
      return { ...config, ...action.patch };
    case 'add-strip':
      return {
        ...config,
        strips: [
          ...config.strips,
          {
            id: newStripId(),
            speciesId: 'hard-maple',
            widthIn: 1.5,
            repeat: 1,
          },
        ],
      };
    case 'duplicate-strip': {
      const index = config.strips.findIndex((strip) => strip.id === action.id);
      if (index < 0) return config;
      const copy = { ...config.strips[index]!, id: newStripId() };
      return {
        ...config,
        strips: [
          ...config.strips.slice(0, index + 1),
          copy,
          ...config.strips.slice(index + 1),
        ],
      };
    }
    case 'delete-strip':
      return {
        ...config,
        strips: config.strips.filter((strip) => strip.id !== action.id),
      };
    case 'move-strip': {
      const index = config.strips.findIndex((strip) => strip.id === action.id);
      const nextIndex = index + action.direction;
      if (index < 0 || nextIndex < 0 || nextIndex >= config.strips.length) return config;
      const strips = config.strips.slice();
      const [strip] = strips.splice(index, 1);
      if (!strip) return config;
      strips.splice(nextIndex, 0, strip);
      return { ...config, strips };
    }
    case 'update-strip':
      return {
        ...config,
        strips: config.strips.map((strip) =>
          strip.id === action.id ? { ...strip, ...action.patch } : strip,
        ),
      };
    default:
      return config;
  }
}

function cloneConfig(config: BoardDesignConfig): BoardDesignConfig {
  return {
    ...config,
    strips: config.strips.map((strip) => ({ ...strip })),
  };
}

function newStripId(): string {
  return `strip-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
