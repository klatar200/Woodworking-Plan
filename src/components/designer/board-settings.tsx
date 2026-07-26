import { KERF_OPTIONS_IN } from '@/lib/cut-optimizer';
import { btnGhost, btnPrimary, selectControl } from '@/lib/ui';
import type { BoardDesignConfig, Grain } from '@/lib/board-designer/types';
import type { ChangeEvent, ReactNode } from 'react';

const inputControl =
  'min-h-[2.75rem] w-full px-[0.75rem] py-0 text-[1rem] text-fg bg-bg border border-border rounded-[0.375rem]';

export function BoardSettings({
  config,
  onChange,
  onCommitCoalesce,
}: {
  config: BoardDesignConfig;
  onChange: (patch: Partial<BoardDesignConfig>) => void;
  onCommitCoalesce: () => void;
}) {
  return (
    <section className="rounded-[0.75rem] border border-border bg-surface p-[1rem]">
      <h2 className="!mt-0 text-[1.125rem]">Settings</h2>

      <div className="grid gap-[0.875rem]">
        <label className="grid gap-[0.375rem]">
          <span className="text-[0.875rem] font-bold">Name</span>
          <input
            className={inputControl}
            name="name"
            value={config.name}
            maxLength={80}
            onChange={(event) => onChange({ name: event.currentTarget.value })}
            onBlur={() => onCommitCoalesce()}
          />
        </label>

        <fieldset className="m-0 border-none p-0">
          <legend className="mb-[0.375rem] text-[0.875rem] font-bold">Grain</legend>
          <div className="flex flex-wrap gap-[0.5rem]">
            <GrainButton
              grain="edge"
              active={config.grain === 'edge'}
              onClick={() => onChange({ grain: 'edge' })}
            >
              Edge grain
            </GrainButton>
            <GrainButton
              grain="end"
              active={config.grain === 'end'}
              onClick={() => onChange({ grain: 'end' })}
            >
              End grain
            </GrainButton>
          </div>
        </fieldset>

        {config.grain === 'edge' && (
          <NumberField
            label="Panel length"
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
            label="Slice thickness"
            name="sliceThicknessIn"
            value={config.sliceThicknessIn}
            min={0.25}
            max={4}
            onChange={(sliceThicknessIn) => onChange({ sliceThicknessIn })}
            onCommitCoalesce={onCommitCoalesce}
          />
        )}

        <label className="grid gap-[0.375rem]">
          <span className="text-[0.875rem] font-bold">Kerf</span>
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

        <label className="grid gap-[0.375rem]">
          <span className="text-[0.875rem] font-bold">Waste allowance</span>
          <input
            className={inputControl}
            name="wasteFactor"
            type="number"
            min={0}
            max={100}
            step={1}
            value={Math.round(config.wasteFactor * 100)}
            onChange={(event) => onChange({ wasteFactor: boundedNumber(event, 0, 100) / 100 })}
            onBlur={() => onCommitCoalesce()}
          />
        </label>
      </div>
    </section>
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
  name,
  value,
  min,
  max,
  onChange,
  onCommitCoalesce,
}: {
  label: string;
  name: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
  onCommitCoalesce: () => void;
}) {
  return (
    <label className="grid gap-[0.375rem]">
      <span className="text-[0.875rem] font-bold">{label}</span>
      <input
        className={inputControl}
        name={name}
        type="number"
        min={min}
        max={max}
        step={0.0625}
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
