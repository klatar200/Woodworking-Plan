import { planeBufferIn } from '@/lib/board-designer/lumber-allowance';
import type { BoardDesignConfig, Grain } from '@/lib/board-designer/types';
import { KERF_OPTIONS_IN } from '@/lib/cut-optimizer';
import { btnGhost, btnPrimary, selectControl } from '@/lib/ui';
import type { ChangeEvent, ReactNode } from 'react';
import { FieldHint } from './field-hint';

const inputControl =
  'min-h-[2.75rem] w-full px-[0.75rem] py-0 text-[1rem] text-fg bg-bg border border-border rounded-[0.375rem]';

/** Top-bar grain toggle (Sprint 67). */
export function BoardGrainToggle({
  grain,
  onChange,
}: {
  grain: Grain;
  onChange: (grain: Grain) => void;
}) {
  return (
    <fieldset className="m-0 flex flex-wrap items-center gap-[0.5rem] border-none p-0">
      <legend className="sr-only">Grain</legend>
      <GrainButton grain="edge" active={grain === 'edge'} onClick={() => onChange('edge')}>
        Edge
      </GrainButton>
      <GrainButton grain="end" active={grain === 'end'} onClick={() => onChange('end')}>
        End
      </GrainButton>
    </fieldset>
  );
}

/**
 * Board settings disclosure for top bar (Sprint 67).
 * Kerf / waste % / panel length / slice thickness — unit suffixes on controls.
 * Name + grain live in the top bar, not here.
 */
export function BoardSettingsDisclosure({
  config,
  onChange,
  onCommitCoalesce,
}: {
  config: BoardDesignConfig;
  onChange: (patch: Partial<BoardDesignConfig>) => void;
  onCommitCoalesce: () => void;
}) {
  return (
    <details className="relative">
      <summary
        className={`${btnGhost} cursor-pointer list-none [&::-webkit-details-marker]:hidden`}
      >
        Board settings
      </summary>
      <div className="absolute right-0 z-[2] mt-[0.5rem] grid w-[min(100vw-2rem,22rem)] gap-[0.875rem] rounded-[0.75rem] border border-border bg-surface p-[1rem] shadow-e2">
        {config.grain === 'edge' && (
          <NumberField
            label="Panel length (in)"
            hint="Usable source board length before strips are laid out."
            name="sourceLengthIn"
            value={config.sourceLengthIn}
            min={1}
            max={96}
            onChange={(sourceLengthIn) => onChange({ sourceLengthIn })}
            onCommitCoalesce={onCommitCoalesce}
          />
        )}

        {config.grain === 'end' && (
          <NumberField
            label="Slice thickness (in)"
            hint="Thickness of each end-grain slice after glue-up."
            name="sliceThicknessIn"
            value={config.sliceThicknessIn}
            min={0.25}
            max={4}
            onChange={(sliceThicknessIn) => onChange({ sliceThicknessIn })}
            onCommitCoalesce={onCommitCoalesce}
          />
        )}

        <label className="grid gap-[0.375rem]">
          <span className="text-[0.875rem] font-bold">Kerf (in)</span>
          <FieldHint>Blade kerf is material removed by the saw cut, in inches.</FieldHint>
          <select
            className={`${selectControl} w-full`}
            name="kerfIn"
            value={config.kerfIn}
            onChange={(event) => onChange({ kerfIn: Number(event.currentTarget.value) })}
          >
            {KERF_OPTIONS_IN.map((kerf) => (
              <option key={kerf} value={kerf}>
                {formatKerf(kerf)}
              </option>
            ))}
          </select>
        </label>

        <NumberField
          label="Plane buffer (in)"
          hint="Material planed off at each glue-up stage, in inches."
          name="planeBuffer"
          value={planeBufferIn(config)}
          min={0}
          max={1}
          step={0.025}
          onChange={(planeBuffer) => onChange({ planeBuffer })}
          onCommitCoalesce={onCommitCoalesce}
        />

        <label className="grid gap-[0.375rem]">
          <span className="text-[0.875rem] font-bold">Defects & snipe (%)</span>
          <FieldHint>
            Extra % of board feet for knots, splits, and snipe — not kerf or planing.
          </FieldHint>
          <input
            className={inputControl}
            name="wasteFactor"
            type="number"
            min={0}
            max={100}
            step={1}
            value={Math.round(config.wasteFactor * 100)}
            onChange={(event) =>
              onChange({ wasteFactor: boundedNumber(event, 0, 100) / 100 })
            }
            onBlur={() => onCommitCoalesce()}
          />
        </label>
      </div>
    </details>
  );
}

function GrainButton({
  grain,
  active,
  onClick,
  children,
}: {
  grain: Grain;
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      className={active ? btnPrimary : btnGhost}
      aria-pressed={active}
      data-grain={grain}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function NumberField({
  label,
  hint,
  name,
  value,
  min,
  max,
  step = 0.0625,
  onChange,
  onCommitCoalesce,
}: {
  label: string;
  hint: string;
  name: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  onCommitCoalesce: () => void;
}) {
  return (
    <label className="grid gap-[0.375rem]">
      <span className="text-[0.875rem] font-bold">{label}</span>
      <FieldHint>{hint}</FieldHint>
      <input
        className={inputControl}
        name={name}
        type="number"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(boundedNumber(event, min, max))}
        onBlur={() => onCommitCoalesce()}
      />
    </label>
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

function formatKerf(value: number): string {
  switch (value) {
    case 0.0625:
      return '1/16"';
    case 0.09375:
      return '3/32"';
    case 0.125:
      return '1/8"';
    case 0.1875:
      return '3/16"';
    default:
      return `${value}"`;
  }
}
