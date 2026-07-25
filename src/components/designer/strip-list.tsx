import { SPECIES, getSpecies, UNKNOWN_SPECIES_COLOR } from '@/lib/board-designer/species';
import type { Strip } from '@/lib/board-designer/types';
import { formatInches } from '@/lib/format';
import { btnGhost, btnPrimary } from '@/lib/ui';
import type { ChangeEvent } from 'react';

const inputControl =
  'min-h-[2.75rem] w-full px-[0.75rem] py-0 text-[1rem] text-fg bg-bg border border-border rounded-[0.375rem]';

export function StripList({
  strips,
  onAdd,
  onDuplicate,
  onDelete,
  onMove,
  onUpdate,
}: {
  strips: Strip[];
  onAdd: () => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onMove: (id: string, direction: -1 | 1) => void;
  onUpdate: (id: string, patch: Partial<Strip>) => void;
}) {
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
                    onClick={() => onMove(strip.id, -1)}
                  >
                    Up
                  </button>
                  <button
                    type="button"
                    className={btnGhost}
                    disabled={index === strips.length - 1}
                    onClick={() => onMove(strip.id, 1)}
                  >
                    Down
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
                <fieldset className="m-0 border-none p-0">
                  <legend className="mb-[0.375rem] text-[0.875rem] font-bold">Species</legend>
                  <div
                    role="radiogroup"
                    aria-label="Species"
                    className="grid grid-cols-2 gap-[0.375rem] sm:grid-cols-4"
                  >
                    {SPECIES.map((species) => {
                      const selected = species.id === strip.speciesId;
                      return (
                        <button
                          key={species.id}
                          type="button"
                          role="radio"
                          aria-checked={selected}
                          tabIndex={selected ? 0 : -1}
                          className={`min-h-[2.75rem] rounded-[0.375rem] border px-[0.625rem] py-0 text-left text-[0.875rem] focus-visible:outline-2 focus-visible:outline-ok focus-visible:outline-offset-2 ${
                            selected
                              ? 'border-fg bg-accent-tint font-bold text-fg'
                              : 'border-border bg-surface text-fg'
                          }`}
                          onClick={() => onUpdate(strip.id, { speciesId: species.id })}
                          onKeyDown={(event) => {
                            if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') {
                              return;
                            }
                            event.preventDefault();
                            const index = SPECIES.findIndex((s) => s.id === strip.speciesId);
                            if (index < 0) return;
                            const delta = event.key === 'ArrowRight' ? 1 : -1;
                            const next =
                              SPECIES[(index + delta + SPECIES.length) % SPECIES.length]!;
                            onUpdate(strip.id, { speciesId: next.id });
                          }}
                        >
                          <span
                            aria-hidden="true"
                            className="mr-[0.375rem] inline-block h-[0.875rem] w-[0.875rem] rounded-[50%] border border-border align-[-0.125rem]"
                            style={{ backgroundColor: species.colorHex }}
                          />
                          {species.name}
                        </button>
                      );
                    })}
                  </div>
                </fieldset>

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
                      onBlur={() => onUpdate(strip.id, { widthIn: snapToSixteenth(strip.widthIn) })}
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
