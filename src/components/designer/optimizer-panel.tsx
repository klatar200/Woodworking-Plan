'use client';

import { useMemo, useState } from 'react';
import { BoardBar } from '@/components/board-bar';
import { designCutPlan } from '@/lib/board-designer/design-cut-plan';
import type { BoardDesignConfig } from '@/lib/board-designer/types';
import { formatInches } from '@/lib/format';
import {
  DEFAULT_OPTIONS,
  STOCK_LENGTHS_IN,
  STOCK_WIDTHS_IN,
  hasImpossibleParts,
  totalBoards,
  yieldRatio,
  type BoardGroup,
} from '@/lib/cut-optimizer';
import { selectControl } from '@/lib/ui';
import { FieldHint } from './field-hint';

/** Spoken article for N-ft stock — "an 8 ft", "a 6 ft". */
function stockFtArticle(ft: number): 'a' | 'an' {
  return ft === 8 || ft === 11 || ft === 18 ? 'an' : 'a';
}

export type CutPlanStock = {
  stockLengthIn: number;
  stockWidthIn: number | null;
};

/** Cut plan groups — dock badge must use the same stock as the panel. */
export function cutPlanGroupsForConfig(
  config: BoardDesignConfig,
  stock: Partial<CutPlanStock> = {},
): BoardGroup[] {
  return designCutPlan(config, {
    stockLengthIn: stock.stockLengthIn ?? DEFAULT_OPTIONS.stockLengthIn,
    stockWidthIn: stock.stockWidthIn ?? null,
    kerfIn: config.kerfIn,
    endTrimIn: DEFAULT_OPTIONS.endTrimIn,
  });
}

export function cutPlanHasImpossible(
  config: BoardDesignConfig,
  stock: Partial<CutPlanStock> = {},
): boolean {
  return hasImpossibleParts(cutPlanGroupsForConfig(config, stock));
}

/**
 * Desktop cut-plan panel (Sprint 64 / U6; Sprint 68 always expanded in dock).
 * Reuses `toParts` → `designCutPlan` → `optimize` / `BoardBar`. No dollar figures.
 * Stock may be controlled by the dock so the Cut plan tab badge stays in sync.
 */
export function OptimizerPanel({
  config,
  stockLengthIn: stockLengthProp,
  stockWidthIn: stockWidthProp,
  onStockLengthChange,
  onStockWidthChange,
}: {
  config: BoardDesignConfig;
  stockLengthIn?: number;
  stockWidthIn?: number | null;
  onStockLengthChange?: (lengthIn: number) => void;
  onStockWidthChange?: (widthIn: number | null) => void;
}) {
  const [internalLength, setInternalLength] = useState(DEFAULT_OPTIONS.stockLengthIn);
  const [internalWidth, setInternalWidth] = useState<number | null>(null);
  const stockLengthIn = stockLengthProp ?? internalLength;
  const stockWidthIn = stockWidthProp !== undefined ? stockWidthProp : internalWidth;
  const setStockLengthIn = onStockLengthChange ?? setInternalLength;
  const setStockWidthIn = onStockWidthChange ?? setInternalWidth;

  const groups = useMemo(
    () => cutPlanGroupsForConfig(config, { stockLengthIn, stockWidthIn }),
    [config, stockLengthIn, stockWidthIn],
  );

  const boards = totalBoards(groups);
  const impossible = hasImpossibleParts(groups);
  const stockFt = stockLengthIn / 12;

  return (
    <section className="grid gap-[1rem] rounded-[0.75rem] border border-border bg-surface p-[1rem]">
      <h2 className="!m-0 text-[1.125rem]">Cut plan — what to buy</h2>

      <div className="grid gap-[1rem]">
        <div className="grid gap-[0.75rem] sm:grid-cols-2">
          <label className="grid gap-[0.375rem]">
            <span className="text-[0.875rem] font-bold">Board length (ft)</span>
            <FieldHint>Stock board length used for the cut plan.</FieldHint>
            <select
              className={`${selectControl} w-full`}
              value={String(stockLengthIn)}
              onChange={(event) => setStockLengthIn(Number(event.currentTarget.value))}
            >
              {STOCK_LENGTHS_IN.map((length) => (
                <option key={length} value={length}>
                  {length / 12} ft ({formatInches(length)})
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-[0.375rem]">
            <span className="text-[0.875rem] font-bold">Board width (in)</span>
            <FieldHint>Stock width for ripped strips, or buy each part&apos;s width.</FieldHint>
            <select
              className={`${selectControl} w-full`}
              value={stockWidthIn === null ? 'rip-none' : String(stockWidthIn)}
              onChange={(event) => {
                const value = event.currentTarget.value;
                setStockWidthIn(value === 'rip-none' ? null : Number(value));
              }}
            >
              <option value="rip-none">Buy each part&apos;s width</option>
              {STOCK_WIDTHS_IN.map((width) => (
                <option key={width} value={width}>
                  Rip from {formatInches(width)} stock
                </option>
              ))}
            </select>
          </label>
        </div>

        <p className="m-0 text-[0.9375rem]">
          Buy <strong>{boards}</strong> {boards === 1 ? 'board' : 'boards'} at {stockFt} ft
          (kerf {formatInches(config.kerfIn)}).
        </p>

        {impossible && (
          <div
            role="alert"
            className="rounded-[0.5rem] border border-danger bg-accent-tint p-[0.75rem] text-[0.9375rem]"
          >
            <strong>
              Some parts do not fit on {stockFtArticle(stockFt)} {stockFt} ft board.
            </strong>{' '}
            They are listed below and are not included in the board count. Pick a longer
            stock length, or plan to join them.
          </div>
        )}

        {groups.map((group) => {
          const yieldPct = Math.round(yieldRatio(group, stockLengthIn) * 100);
          const key = `${group.material ?? 'stock'}-${group.thicknessIn}x${group.widthIn}`;

          return (
            <section key={key} className="grid gap-[0.5rem]">
              <h3 className="m-0 text-[0.9375rem]">
                {group.material ? `${group.material} — ` : null}
                {formatInches(group.thicknessIn)} × {formatInches(group.widthIn)}
              </h3>

              <p className="m-0 text-[0.8125rem] text-muted">
                <strong>
                  {group.physicalBoards}{' '}
                  {group.physicalBoards === 1 ? 'board' : 'boards'}
                </strong>
                {group.ripsPerBoard > 1 && (
                  <>
                    {' '}
                    — {group.lanes} lengths, {group.ripsPerBoard} ripped side-by-side from
                    each {formatInches(group.stockWidthIn)} board
                  </>
                )}{' '}
                {/* yieldRatio numerator includes kerf + end trim (consumed sawdust). */}
                · {yieldPct}% of each board consumed
              </p>

              {group.impossible.length > 0 && (
                <ul
                  role="alert"
                  className="m-0 grid gap-[0.375rem] rounded-[0.5rem] border border-danger bg-accent-tint p-[0.75rem] pl-[1.5rem] text-[0.875rem]"
                >
                  {group.impossible.map((item) => (
                    <li key={item.id}>
                      <strong>{item.label}</strong> at {formatInches(item.lengthIn)} —{' '}
                      {item.reason}
                    </li>
                  ))}
                </ul>
              )}

              <ol className="board-list m-0 grid gap-[0.75rem] p-0 list-none">
                {group.boards.map((board, index) => (
                  <li key={index} className="board grid gap-[0.25rem]">
                    <p className="m-0 text-[0.8125rem] text-muted">
                      {group.ripsPerBoard > 1 ? 'Length' : 'Board'} {index + 1}
                      {' · '}
                      {formatInches(board.offcutIn)} left over
                    </p>
                    <BoardBar
                      board={board}
                      number={index + 1}
                      ripped={group.ripsPerBoard > 1}
                    />
                  </li>
                ))}
              </ol>
            </section>
          );
        })}
      </div>
    </section>
  );
}
