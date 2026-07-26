import { SPECIES, getSpecies, UNKNOWN_SPECIES_COLOR } from '@/lib/board-designer/species';
import type { Grain, Strip } from '@/lib/board-designer/types';
import { formatInches } from '@/lib/format';
import { btnGhost, btnPrimary } from '@/lib/ui';
import type { ChangeEvent } from 'react';

const inputControl =
  'min-h-[2.75rem] w-full px-[0.75rem] py-0 text-[1rem] text-fg bg-bg border border-border rounded-[0.375rem]';

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
  onAdd,
  onDuplicate,
  onDelete,
  onMove,
  onUpdate,
  onCommitCoalesce,
}: {
  grain: Grain;
  strips: Strip[];
  onAdd: () => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onMove: (id: string, direction: -1 | 1) => void;
  onUpdate: (id: string, patch: Partial<Strip>) => void;
  /** Ends coalesced Width/Repeat typing so the next edit is a new undo step. */
  onCommitCoalesce: () => void;
}) {
  const move = stripMoveLabels(grain);

  return (
    <section className="rounded-[0.75rem] border border-border bg-surface p-[1rem]">
      <div className="mb-[0.75rem] flex flex-wrap items-center justify-between gap-[0.75rem]">
        <h2 className="!m-0 text-[1.125rem]">Strips</h2>
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
                  <h3 className="m-0 text-[1rem]">Strip {index + 1}</h3>
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
              </div>
            </li>
          ))}
        </ol>
      )}

      {strips.some((strip) => !getSpecies(strip.speciesId)) && (
        <p className="mt-[0.75rem] mb-0 text-[0.875rem] text-muted">
          Unknown wood uses the fallback swatch.
          <span
            aria-hidden="true"
            className="ml-[0.375rem] inline-block h-[0.875rem] w-[0.875rem] rounded-[50%] border border-border align-[-0.125rem]"
            style={{ backgroundColor: UNKNOWN_SPECIES_COLOR }}
          />
        </p>
      )}
    </section>
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
