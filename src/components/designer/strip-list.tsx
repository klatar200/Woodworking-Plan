'use client';

import { closingThicknessHint } from '@/lib/board-designer/miter-geometry';
import { SPECIES, getSpecies, UNKNOWN_SPECIES_COLOR } from '@/lib/board-designer/species';
import { stripDisplayName } from '@/lib/board-designer/strip-display';
import { formatStripReorderAnnouncement, stripReorderAnnouncement } from '@/lib/board-designer/strip-reorder-announce';
import { dropIndexFromClientY } from '@/lib/board-designer/strip-drag';
import type { Grain, Miter, MiterCorner, Strip } from '@/lib/board-designer/types';
import { formatInches } from '@/lib/format';
import { btnGhost, btnPrimary } from '@/lib/ui';
import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react';

const inputControl =
  'min-h-[2.75rem] w-full px-[0.75rem] py-0 text-[1rem] text-fg bg-bg border border-border rounded-[0.375rem]';

const CORNER_OPTIONS: { value: MiterCorner; label: string }[] = [
  { value: 'tl', label: 'Top left' },
  { value: 'tr', label: 'Top right' },
  { value: 'bl', label: 'Bottom left' },
  { value: 'br', label: 'Bottom right' },
];

/** Labels follow the top-face diagram axes (layout.ts), never the orbit camera. */
export function stripMoveLabels(grain: Grain): { earlier: string; later: string } {
  if (grain === 'edge') {
    return { earlier: 'Toward top', later: 'Toward bottom' };
  }
  return { earlier: 'Toward left', later: 'Toward right' };
}

export function StripList({
  grain,
  strips,
  panelThicknessIn,
  onAdd,
  onDuplicate,
  onDelete,
  onMove,
  onReorder,
  onUpdate,
  onCommitCoalesce,
}: {
  grain: Grain;
  strips: Strip[];
  panelThicknessIn: number;
  onAdd: () => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onMove: (id: string, direction: -1 | 1) => void;
  /** One call per completed drag — maps to a single `reorder-strip` history entry. */
  onReorder: (fromIndex: number, toIndex: number) => void;
  onUpdate: (id: string, patch: Partial<Strip>) => void;
  onCommitCoalesce: () => void;
}) {
  const move = stripMoveLabels(grain);
  const listRef = useRef<HTMLOListElement>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);
  const [selectedStripId, setSelectedStripId] = useState<string | null>(strips[0]?.id ?? null);
  const [announce, setAnnounce] = useState('');
  const dragFrom = useRef<number | null>(null);
  /** null until after mount — skip announcing the initial strip list. */
  const prevStripIdsRef = useRef<string[] | null>(null);
  /** Call-site already announced (arrow/drag); effect must not double-speak. */
  const skipEffectAnnounceRef = useRef(false);

  useEffect(() => {
    if (!announce) return;
    const t = window.setTimeout(() => setAnnounce(''), 1500);
    return () => window.clearTimeout(t);
  }, [announce]);

  useEffect(() => {
    if (strips.length === 0) {
      if (selectedStripId !== null) setSelectedStripId(null);
      return;
    }
    if (!selectedStripId || !strips.some((strip) => strip.id === selectedStripId)) {
      setSelectedStripId(strips[0]!.id);
    }
  }, [selectedStripId, strips]);

  function speakReorder(message: string) {
    // Clear first so polite live regions re-fire when text matches a prior announce.
    setAnnounce('');
    queueMicrotask(() => setAnnounce(message));
  }

  // Undo/redo of a reorder updates `strips` without going through onMove/onReorder.
  useEffect(() => {
    const ids = strips.map((s) => s.id);
    const prev = prevStripIdsRef.current;
    prevStripIdsRef.current = ids;
    if (prev === null) return;
    if (skipEffectAnnounceRef.current) {
      skipEffectAnnounceRef.current = false;
      return;
    }
    const msg = formatStripReorderAnnouncement(prev, strips);
    if (msg) speakReorder(msg);
  }, [strips]);

  // One closing-thickness hint per distinct (width, thickness, angle).
  const firstHintForKey = new Set<string>();
  const showClosingHintById = new Map<string, boolean>();
  for (const strip of strips) {
    if (!strip.miter) {
      showClosingHintById.set(strip.id, false);
      continue;
    }
    const key = `${strip.widthIn}\0${panelThicknessIn}\0${strip.miter.angleDeg}`;
    const show = !firstHintForKey.has(key);
    if (show) firstHintForKey.add(key);
    showClosingHintById.set(strip.id, show);
  }

  const selectedIndex = Math.max(
    0,
    strips.findIndex((strip) => strip.id === selectedStripId),
  );
  const selectedStrip = strips[selectedIndex] ?? null;

  function indexFromClientY(clientY: number): number {
    const list = listRef.current;
    if (!list) return dragFrom.current ?? 0;
    const items = [...list.querySelectorAll<HTMLElement>('[data-strip-index]')];
    const rects = items.map((el) => {
      const r = el.getBoundingClientRect();
      return { top: r.top, height: r.height };
    });
    return dropIndexFromClientY(clientY, rects, dragFrom.current ?? 0);
  }

  function onHandlePointerDown(event: ReactPointerEvent<HTMLButtonElement>, index: number) {
    if (event.button !== 0) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragFrom.current = index;
    setDragIndex(index);
    setOverIndex(index);
  }

  function onHandlePointerMove(event: ReactPointerEvent<HTMLButtonElement>) {
    if (dragFrom.current === null) return;
    setOverIndex(indexFromClientY(event.clientY));
  }

  function onHandlePointerUp(event: ReactPointerEvent<HTMLButtonElement>) {
    if (dragFrom.current === null) return;
    const from = dragFrom.current;
    const to = indexFromClientY(event.clientY);
    dragFrom.current = null;
    setDragIndex(null);
    setOverIndex(null);
    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      // Already released.
    }
    if (from === to) return;
    const strip = strips[from];
    if (strip) {
      skipEffectAnnounceRef.current = true;
      speakReorder(stripReorderAnnouncement(strip, from, to, strips.length));
    }
    onReorder(from, to);
  }

  return (
    <div>
      <div className="mb-[0.75rem] flex flex-wrap items-center justify-between gap-[0.75rem]">
        <h3 className="!m-0 text-[1rem]">Strips</h3>
        <button type="button" className={btnPrimary} onClick={onAdd}>
          Add a strip
        </button>
      </div>

      <p className="sr-only" aria-live="polite">
        {announce}
      </p>

      {strips.length === 0 ? (
        <div className="rounded-[0.5rem] border border-dashed border-border p-[1rem] text-[0.9375rem] text-muted">
          <p className="m-0 mb-[0.75rem]">Add a strip to see your board.</p>
          <button type="button" className={btnGhost} onClick={onAdd}>
            Add a strip
          </button>
        </div>
      ) : (
        <>
          <ol ref={listRef} className="m-0 grid list-none gap-[0.625rem] p-0">
            {strips.map((strip, index) => {
              const dragging = dragIndex === index;
              const dropTarget = overIndex === index && dragIndex !== null && dragIndex !== index;
              const selected = strip.id === selectedStrip?.id;
              const displayName = stripDisplayName(strip, index);
              return (
                <li
                  key={strip.id}
                  data-strip-index={index}
                  data-selected={selected ? 'true' : undefined}
                  onClick={() => setSelectedStripId(strip.id)}
                  className={[
                    'rounded-[0.5rem] border bg-bg p-[0.625rem] transition-[border-color,opacity,box-shadow] duration-150',
                    dropTarget
                      ? 'border-accent shadow-e2 ring-2 ring-accent/40'
                      : selected
                        ? 'border-accent shadow-e2'
                        : 'border-border shadow-e1',
                    dragging ? 'opacity-60' : 'opacity-100',
                  ].join(' ')}
                >
                  <div className="flex flex-wrap items-center justify-between gap-[0.625rem]">
                    <div className="flex min-w-[14rem] flex-1 items-center gap-[0.5rem]">
                      {/* Pointer-only affordance: Toward left/right are the keyboard path
                          (SC 2.1.1). An inert focusable control is worse than none. */}
                      <button
                        type="button"
                        tabIndex={-1}
                        aria-hidden="true"
                        className={`${btnGhost} cursor-grab touch-none px-[0.5rem]! active:cursor-grabbing`}
                        onPointerDown={(e) => onHandlePointerDown(e, index)}
                        onPointerMove={onHandlePointerMove}
                        onPointerUp={onHandlePointerUp}
                        onPointerCancel={onHandlePointerUp}
                      >
                        ⋮⋮
                      </button>
                      <span
                        aria-hidden="true"
                        className="inline-block h-[1.25rem] w-[1.25rem] shrink-0 rounded-[50%] border border-border"
                        style={{
                          backgroundColor:
                            getSpecies(strip.speciesId)?.colorHex ?? UNKNOWN_SPECIES_COLOR,
                        }}
                      />
                      <div className="min-w-0 flex-1">
                        <label className="sr-only" htmlFor={`strip-${strip.id}-label`}>
                          Strip label
                        </label>
                        <input
                          id={`strip-${strip.id}-label`}
                          className="min-h-[2.25rem] w-full rounded-[0.375rem] border border-border bg-bg px-[0.625rem] py-0 text-[0.9375rem] text-fg"
                          maxLength={40}
                          placeholder={displayName}
                          value={strip.label ?? ''}
                          onFocus={() => setSelectedStripId(strip.id)}
                          onChange={(event) => {
                            const label = event.currentTarget.value.slice(0, 40);
                            onUpdate(strip.id, {
                              label: label.trim() ? label : undefined,
                            });
                          }}
                          onBlur={() => {
                            const label = normalizeStripLabel(strip.label);
                            if (label !== strip.label) onUpdate(strip.id, { label });
                            onCommitCoalesce();
                          }}
                        />
                        <p className="m-0 mt-[0.25rem] truncate text-[0.8125rem] text-muted">
                          {getSpecies(strip.speciesId)?.name ?? strip.speciesId} ·{' '}
                          {formatInches(strip.widthIn)}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-[0.375rem]">
                      <button
                        type="button"
                        className={btnGhost}
                        disabled={index === 0}
                        aria-label={`Move ${displayName} ${move.earlier.toLowerCase()} of the board face`}
                        onClick={() => {
                          const to = index - 1;
                          skipEffectAnnounceRef.current = true;
                          speakReorder(stripReorderAnnouncement(strip, index, to, strips.length));
                          onMove(strip.id, -1);
                        }}
                      >
                        {move.earlier}
                      </button>
                      <button
                        type="button"
                        className={btnGhost}
                        disabled={index === strips.length - 1}
                        aria-label={`Move ${displayName} ${move.later.toLowerCase()} of the board face`}
                        onClick={() => {
                          const to = index + 1;
                          skipEffectAnnounceRef.current = true;
                          speakReorder(stripReorderAnnouncement(strip, index, to, strips.length));
                          onMove(strip.id, 1);
                        }}
                      >
                        {move.later}
                      </button>
                      <button type="button" className={btnGhost} onClick={() => onDuplicate(strip.id)}>
                        Duplicate
                      </button>
                      <button type="button" className={btnGhost} onClick={() => onDelete(strip.id)}>
                        Delete
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>

          {selectedStrip ? (
            <section
              aria-label={`Selected strip details for ${stripDisplayName(selectedStrip, selectedIndex)}`}
              className="mt-[0.875rem] grid gap-[0.75rem] rounded-[0.5rem] border border-accent bg-surface p-[0.875rem] shadow-e1"
            >
              <div>
                <h4 className="!m-0 text-[1rem]">
                  {stripDisplayName(selectedStrip, selectedIndex)}
                </h4>
                <p className="m-0 text-[0.875rem] text-muted">
                  Selected strip details
                </p>
              </div>

              <label className="grid gap-[0.375rem]">
                <span className="text-[0.875rem] font-bold">Species</span>
                <div className="flex min-w-0 items-center gap-[0.5rem]">
                  <span
                    aria-hidden="true"
                    className="inline-block h-[1.25rem] w-[1.25rem] shrink-0 rounded-[50%] border border-border"
                    style={{
                      backgroundColor:
                        getSpecies(selectedStrip.speciesId)?.colorHex ?? UNKNOWN_SPECIES_COLOR,
                    }}
                  />
                  <select
                    className={`${inputControl} min-w-0 flex-1`}
                    name={`strip-${selectedStrip.id}-speciesId`}
                    value={selectedStrip.speciesId}
                    onChange={(event) =>
                      onUpdate(selectedStrip.id, { speciesId: event.currentTarget.value })
                    }
                  >
                    {!getSpecies(selectedStrip.speciesId) && (
                      <option value={selectedStrip.speciesId} disabled>
                        {selectedStrip.speciesId}
                      </option>
                    )}
                    {SPECIES.map((species) => (
                      <option key={species.id} value={species.id}>
                        {species.name}
                      </option>
                    ))}
                  </select>
                </div>
              </label>

              <div className="grid gap-[0.75rem] sm:grid-cols-2">
                <label className="grid gap-[0.375rem]">
                  <span className="text-[0.875rem] font-bold">Width</span>
                  <input
                    className={inputControl}
                    name={`strip-${selectedStrip.id}-widthIn`}
                    type="number"
                    min={0.0625}
                    max={24}
                    step={0.0625}
                    value={selectedStrip.widthIn}
                    onChange={(event) =>
                      onUpdate(selectedStrip.id, { widthIn: boundedNumber(event, 0.0625, 24) })
                    }
                    onBlur={() => {
                      onUpdate(selectedStrip.id, { widthIn: snapToSixteenth(selectedStrip.widthIn) });
                      onCommitCoalesce();
                    }}
                  />
                </label>
                <label className="grid gap-[0.375rem]">
                  <span className="text-[0.875rem] font-bold">Repeat</span>
                  <input
                    className={inputControl}
                    name={`strip-${selectedStrip.id}-repeat`}
                    type="number"
                    min={1}
                    max={20}
                    step={1}
                    value={selectedStrip.repeat}
                    onChange={(event) =>
                      onUpdate(selectedStrip.id, {
                        repeat: Math.round(boundedNumber(event, 1, 20)),
                      })
                    }
                    onBlur={() => onCommitCoalesce()}
                  />
                </label>
              </div>

              <MiterControls
                strip={selectedStrip}
                panelThicknessIn={panelThicknessIn}
                showClosingHint={showClosingHintById.get(selectedStrip.id) === true}
                onUpdate={onUpdate}
                onCommitCoalesce={onCommitCoalesce}
              />
            </section>
          ) : null}
        </>
      )}

      {strips.some(
        (strip) =>
          !getSpecies(strip.speciesId) ||
          (strip.miter && !getSpecies(strip.miter.speciesId)),
      ) && (
        <p className="mt-[0.75rem] mb-0 text-[0.875rem] text-muted">
          Unknown wood uses the fallback swatch.
          <span
            aria-hidden="true"
            className="ml-[0.375rem] inline-block h-[0.875rem] w-[0.875rem] rounded-[50%] border border-border align-[-0.125rem]"
            style={{ backgroundColor: UNKNOWN_SPECIES_COLOR }}
          />
        </p>
      )}
    </div>
  );
}

function MiterControls({
  strip,
  panelThicknessIn,
  showClosingHint,
  onUpdate,
  onCommitCoalesce,
}: {
  strip: Strip;
  panelThicknessIn: number;
  showClosingHint: boolean;
  onUpdate: (id: string, patch: Partial<Strip>) => void;
  onCommitCoalesce: () => void;
}) {
  const enabled = Boolean(strip.miter);
  const miter: Miter = strip.miter ?? {
    speciesId: strip.speciesId === 'walnut' ? 'hard-maple' : 'walnut',
    angleDeg: 30,
    corner: 'tr',
  };

  return (
    <div className="grid gap-[0.75rem] rounded-[0.375rem] border border-border/80 p-[0.75rem]">
      <label className="flex min-h-[2.75rem] items-center gap-[0.625rem]">
        <input
          type="checkbox"
          className="h-[1.25rem] w-[1.25rem]"
          name={`strip-${strip.id}-mitered`}
          checked={enabled}
          onChange={(event) => {
            if (event.currentTarget.checked) {
              onUpdate(strip.id, { miter: { ...miter } });
            } else {
              onUpdate(strip.id, { miter: undefined });
            }
          }}
        />
        <span className="text-[0.875rem] font-bold">Mitered</span>
      </label>

      {enabled ? (
        <>
          <label className="grid gap-[0.375rem]">
            <span className="text-[0.875rem] font-bold">Wedge species</span>
            <div className="flex min-w-0 items-center gap-[0.5rem]">
              <span
                aria-hidden="true"
                className="inline-block h-[1.25rem] w-[1.25rem] shrink-0 rounded-[50%] border border-border"
                style={{
                  backgroundColor:
                    getSpecies(miter.speciesId)?.colorHex ?? UNKNOWN_SPECIES_COLOR,
                }}
              />
              <select
                className={`${inputControl} min-w-0 flex-1`}
                name={`strip-${strip.id}-miter-speciesId`}
                value={miter.speciesId}
                onChange={(event) =>
                  onUpdate(strip.id, {
                    miter: { ...miter, speciesId: event.currentTarget.value },
                  })
                }
              >
                {!getSpecies(miter.speciesId) && (
                  <option value={miter.speciesId} disabled>
                    {miter.speciesId}
                  </option>
                )}
                {SPECIES.map((species) => (
                  <option key={species.id} value={species.id}>
                    {species.name}
                  </option>
                ))}
              </select>
            </div>
          </label>

          <div className="grid gap-[0.75rem] sm:grid-cols-2">
            <label className="grid gap-[0.375rem]">
              <span className="text-[0.875rem] font-bold">Angle (°)</span>
              <input
                className={inputControl}
                name={`strip-${strip.id}-miter-angleDeg`}
                type="number"
                min={5}
                max={85}
                step={0.5}
                value={miter.angleDeg}
                onChange={(event) =>
                  onUpdate(strip.id, {
                    miter: {
                      ...miter,
                      angleDeg: boundedNumber(event, 5, 85),
                    },
                  })
                }
                onBlur={() => onCommitCoalesce()}
              />
            </label>
            <label className="grid gap-[0.375rem]">
              <span className="text-[0.875rem] font-bold">Corner</span>
              <select
                className={inputControl}
                name={`strip-${strip.id}-miter-corner`}
                value={miter.corner}
                onChange={(event) =>
                  onUpdate(strip.id, {
                    miter: {
                      ...miter,
                      corner: event.currentTarget.value as MiterCorner,
                    },
                  })
                }
              >
                {CORNER_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {showClosingHint ? (
            <p className="m-0 text-[0.875rem] text-muted">
              {closingThicknessHint(strip.widthIn, panelThicknessIn, miter.angleDeg)}
            </p>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

function boundedNumber(
  event: ChangeEvent<HTMLInputElement>,
  min: number,
  max: number,
): number {
  const value = Number(event.currentTarget.value);
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

function snapToSixteenth(value: number): number {
  return Math.min(24, Math.max(0.0625, Math.round(value * 16) / 16));
}

function normalizeStripLabel(value: string | undefined): string | undefined {
  const label = value?.trim();
  return label ? label : undefined;
}
