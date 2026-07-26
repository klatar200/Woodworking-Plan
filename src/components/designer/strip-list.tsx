import {
  closingThicknessIn,
  thicknessMismatchesClose,
} from '@/lib/board-designer/miter-geometry';
import { SPECIES, getSpecies, UNKNOWN_SPECIES_COLOR } from '@/lib/board-designer/species';
import type { Grain, Miter, MiterCorner, Strip } from '@/lib/board-designer/types';
import { formatInches } from '@/lib/format';
import { btnGhost, btnPrimary } from '@/lib/ui';
import type { ChangeEvent } from 'react';

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
  onUpdate: (id: string, patch: Partial<Strip>) => void;
  onCommitCoalesce: () => void;
}) {
  const move = stripMoveLabels(grain);

  return (
    <div>
      <div className="mb-[0.75rem] flex flex-wrap items-center justify-between gap-[0.75rem]">
        <h3 className="!m-0 text-[1rem]">Strips</h3>
        <button type="button" className={btnPrimary} onClick={onAdd}>
          Add a strip
        </button>
      </div>

      {strips.length === 0 ? (
        <div className="rounded-[0.5rem] border border-dashed border-border p-[1rem] text-[0.9375rem] text-muted">
          <p className="m-0 mb-[0.75rem]">Add a strip to see your board.</p>
          <button type="button" className={btnGhost} onClick={onAdd}>
            Add a strip
          </button>
        </div>
      ) : (
        <ol className="m-0 grid list-none gap-[0.875rem] p-0">
          {strips.map((strip, index) => (
            <li
              key={strip.id}
              className="rounded-[0.5rem] border border-border bg-bg p-[0.875rem]"
            >
              <div className="mb-[0.75rem] flex flex-wrap items-center justify-between gap-[0.75rem]">
                <div>
                  <h4 className="m-0 text-[1rem]">Strip {index + 1}</h4>
                  <p className="m-0 text-[0.875rem] text-muted">
                    {getSpecies(strip.speciesId)?.name ?? strip.speciesId} ·{' '}
                    {formatInches(strip.widthIn)}
                  </p>
                </div>
                <div className="flex flex-wrap gap-[0.375rem]">
                  <button
                    type="button"
                    className={btnGhost}
                    disabled={index === 0}
                    aria-label={`Move strip ${move.earlier.toLowerCase()} of the board face`}
                    onClick={() => onMove(strip.id, -1)}
                  >
                    {move.earlier}
                  </button>
                  <button
                    type="button"
                    className={btnGhost}
                    disabled={index === strips.length - 1}
                    aria-label={`Move strip ${move.later.toLowerCase()} of the board face`}
                    onClick={() => onMove(strip.id, 1)}
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

              <div className="grid gap-[0.75rem]">
                <label className="grid gap-[0.375rem]">
                  <span className="text-[0.875rem] font-bold">Species</span>
                  <div className="flex min-w-0 items-center gap-[0.5rem]">
                    <span
                      aria-hidden="true"
                      className="inline-block h-[1.25rem] w-[1.25rem] shrink-0 rounded-[50%] border border-border"
                      style={{
                        backgroundColor:
                          getSpecies(strip.speciesId)?.colorHex ?? UNKNOWN_SPECIES_COLOR,
                      }}
                    />
                    <select
                      className={`${inputControl} min-w-0 flex-1`}
                      name={`strip-${strip.id}-speciesId`}
                      value={strip.speciesId}
                      onChange={(event) =>
                        onUpdate(strip.id, { speciesId: event.currentTarget.value })
                      }
                    >
                      {!getSpecies(strip.speciesId) && (
                        <option value={strip.speciesId} disabled>
                          {strip.speciesId}
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
                      name={`strip-${strip.id}-widthIn`}
                      type="number"
                      min={0.0625}
                      max={24}
                      step={0.0625}
                      value={strip.widthIn}
                      onChange={(event) =>
                        onUpdate(strip.id, { widthIn: boundedNumber(event, 0.0625, 24) })
                      }
                      onBlur={() => {
                        onUpdate(strip.id, { widthIn: snapToSixteenth(strip.widthIn) });
                        onCommitCoalesce();
                      }}
                    />
                  </label>
                  <label className="grid gap-[0.375rem]">
                    <span className="text-[0.875rem] font-bold">Repeat</span>
                    <input
                      className={inputControl}
                      name={`strip-${strip.id}-repeat`}
                      type="number"
                      min={1}
                      max={20}
                      step={1}
                      value={strip.repeat}
                      onChange={(event) =>
                        onUpdate(strip.id, { repeat: Math.round(boundedNumber(event, 1, 20)) })
                      }
                      onBlur={() => onCommitCoalesce()}
                    />
                  </label>
                </div>

                <MiterControls
                  strip={strip}
                  panelThicknessIn={panelThicknessIn}
                  onUpdate={onUpdate}
                  onCommitCoalesce={onCommitCoalesce}
                />
              </div>
            </li>
          ))}
        </ol>
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
  onUpdate,
  onCommitCoalesce,
}: {
  strip: Strip;
  panelThicknessIn: number;
  onUpdate: (id: string, patch: Partial<Strip>) => void;
  onCommitCoalesce: () => void;
}) {
  const enabled = Boolean(strip.miter);
  const miter: Miter = strip.miter ?? {
    speciesId: strip.speciesId === 'walnut' ? 'hard-maple' : 'walnut',
    angleDeg: 30,
    corner: 'tr',
  };
  const ideal = closingThicknessIn(strip.widthIn, miter.angleDeg);
  const mismatch =
    enabled &&
    thicknessMismatchesClose(strip.widthIn, panelThicknessIn, miter.angleDeg);

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

          <p className="m-0 text-[0.875rem] text-muted">
            Closing thickness for a {formatInches(strip.widthIn)} strip at{' '}
            {miter.angleDeg}° is ≈ {formatInches(ideal)}
            {mismatch
              ? ` — panel is ${formatInches(panelThicknessIn)} (>5% off; lattice will not close).`
              : '.'}
          </p>
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
